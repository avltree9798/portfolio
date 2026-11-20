---
title: 'Game Boy emulator 2: memory is an interface'
date: '2026-11-20'
summary: 'Build a memory bus, understand memory-mapped devices, load cartridge data and reason about bank switching.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 2 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

A web application might route `/users/42` to a handler. A Game Boy routes `0xFF04` to a timer register. The representation differs, but the design question is familiar: which component owns this request?

The memory bus makes that routing explicit. It is the seam that lets the CPU access devices without knowing their internal data structures.

## An address is not necessarily an array index

A 16-bit address can represent 65,536 different values. That does not mean the machine is one flat 64 KiB array.

Some addresses select ordinary RAM. Others select cartridge data, display memory or a device register. Writing a device register can change behaviour instead of storing a byte for a later read.

The main ranges in [the bus implementation](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/bus.c) are:

| Address range    | Responsibility                    |
| ---------------- | --------------------------------- |
| `0000` to `7FFF` | Cartridge ROM and mapper controls |
| `8000` to `9FFF` | Video RAM                         |
| `A000` to `BFFF` | Cartridge RAM when provided       |
| `C000` to `DFFF` | Work RAM                          |
| `E000` to `FDFF` | Hardware work-RAM mirror          |
| `FE00` to `FE9F` | Sprite attributes                 |
| `FF00` to `FF7F` | Memory-mapped device registers    |
| `FF80` to `FFFE` | High RAM                          |
| `FFFF`           | Interrupt enable register         |

There are additional unusable ranges between these regions. [Pan Docs describes the hardware memory map](https://gbdev.io/pandocs/Memory_Map.html); the table above is a map to responsibilities, not a claim that this source implements every access rule.

For example, the current echo-RAM branch returns zero and ignores writes. The hardware region mirrors work RAM. That difference is small in code and significant to software that accesses it.

## Keep the CPU on the public interface

Consider a teaching example for a load from memory:

```c
u16 address = cpu_read_reg(RT_HL);
u8 value = bus_read(address);
cpu_set_reg(RT_A, value);
```

The CPU does not reach into a cartridge buffer or a PPU array. That gives us one place to model overlays, side effects and access restrictions.

It also makes testing easier. A CPU test can supply a controlled bus, while a bus test can check address boundaries without decoding instructions.

There is a qualification. An emulated device may need a different view of memory from the CPU. Later, if CPU reads of video RAM become restricted during rendering, the PPU must still be able to fetch its own data. A single function called `bus_read()` is convenient initially, but should not silently imply identical permissions for every bus master.

## Trace one write all the way through

A write to `0xFF46` takes this path:

```text
CPU instruction
  bus_write(0xFF46, value)
    io_write(...)
      lcd_write(...)
        dma_start(value)
```

Nothing about that operation is equivalent to `memory[address] = value`. It starts a transfer that continues over subsequent cycles.

The same pattern appears elsewhere. `0xFF00` selects joypad input lines. `0xFF04` resets the divider when written. `0xFF50` controls the boot ROM mapping. Audio registers route into the APU.

That is memory-mapped I/O: device operations exposed through the same read and write vocabulary as memory.

## Bytes have an order

The CPU can operate on 16-bit values while the bus transfers individual bytes. `bus_read16()` reads the low byte first and combines the second byte as the upper half.

For bytes `0x34` and `0x12` at successive addresses:

```text
value = 0x34 | (0x12 << 8)
      = 0x1234
```

This is little-endian storage. It describes byte order in emulated memory, not a licence to assume anything about the host’s byte order or C structure layout.

The snapshot’s `bus_write16()` writes the high-address byte first. The final contents can look right even if the order of bus transactions differs from an instruction’s hardware behaviour. Keep those two correctness questions separate when adding cycle-level accuracy.

## A cartridge is a device with state

[The cartridge loader](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cart.c) reads a file, retains its bytes and interprets a header near `0x0100`. The header describes details such as the cartridge type and declared ROM and RAM sizes.

The current loader casts a pointer into that byte buffer to a `rom_header` structure. It is concise, but file formats should ideally be decoded using explicit offsets and bounds checks. A short file is not guaranteed to contain even the header, and host structure layout is not the file format’s specification.

The loader also changes the title bytes to insert a terminator. A more robust design copies a bounded title into a separate string, leaving the original cartridge bytes unchanged.

A safer loading sequence would be:

1. Open the file in binary mode.
2. Obtain and validate the actual byte count.
3. Reject files too short for the fields we will read.
4. Decode each header field explicitly.
5. Check that the requested mapper and sizes are supported.
6. Allocate memory and check allocation results.
7. Validate the header checksum against its stored byte.

That last comparison is missing from the printed verdict in this snapshot. The code computes a checksum, then labels the result based on whether its low byte is non-zero, rather than comparing it with the header checksum. A reassuring message is only useful if its condition expresses the property we intended to verify.

## Bank switching is address translation

Why bank a cartridge at all? A program can be larger than the window through which the CPU sees it.

A memory bank controller, or MBC, changes which portion of the cartridge appears in that window. This implementation recognises the MBC1 type range and keeps a pointer for the selected upper ROM bank.

For a simple example, selecting bank 2 maps CPU address `0x4000` to file offset:

```text
bank start = 2 × 0x4000 = 0x8000
within-bank offset = 0x4000 - 0x4000 = 0
file offset = 0x8000
```

A write into a ROM address range changes mapper state. It does not rewrite ROM data.

[The full MBC1 rules](https://gbdev.io/pandocs/MBC1.html) combine a lower bank register, a secondary register and a mode bit. The repository implements a smaller subset. In particular, its upper-bank pointer uses the lower register directly, and its lower ROM window stays fixed. Do not interpret the presence of the MBC1 label as full large-cartridge banking support.

There is also an ordering lesson in the bank-zero handling. The code changes a literal zero to one before masking the value to five bits. An input such as `0x20` can therefore become zero after that check. The effective bank rules need to be expressed and tested together.

## Saved data has a format too

Battery-backed RAM lives in host files ending in `.battery`. The current save function writes one 8 KiB selected RAM bank. That is not the same as serialising every allocated bank, and it does not identify which bank those bytes belong to.

For a more complete design, define the saved state explicitly. Include all relevant banks in a stable order, check reads and writes, and decide how to avoid a partially written save replacing a valid one.

These are familiar persistence questions. The emulator simply makes them visible at a much smaller scale.

## Checkpoint

Build a boundary table for addresses immediately before and after each bus region. Then design a fake cartridge whose banks contain different repeated values. Reading the same CPU address after a bank change should produce a predictable difference.

Those tests isolate routing and translation before a game’s control flow makes the symptoms difficult to interpret.

## Continue the series

[Previous: A machine in miniature](/blog/game-boy-emulator-01-foundations/). [Next: Teaching a CPU to execute](/blog/game-boy-emulator-03-cpu/).

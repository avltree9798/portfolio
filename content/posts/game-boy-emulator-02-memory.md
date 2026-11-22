---
title: 'Game Boy emulator 2: memory and the bus'
date: '2026-11-20'
summary: 'Building a memory bus, memory-mapped devices, loading cartridge data and bank switching.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 2 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

A web app routes `/users/42` to a handler. The Game Boy routes `0xFF04` to a timer register. The question in both cases is which component handles the request.

The memory bus answers it. The CPU reads and writes addresses through the bus, and never needs to know how each device stores its data.

## The address map

A 16-bit address has 65,536 possible values, but the machine isn't one flat 64 KiB array.

Some addresses are ordinary RAM. Others are cartridge data, display memory or device registers, and writing a device register can change how the device behaves rather than just storing a byte.

The main ranges in [`bus.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/bus.c) are:

| Address range    | Handled by                        |
| ---------------- | --------------------------------- |
| `0000` to `7FFF` | Cartridge ROM and mapper controls |
| `8000` to `9FFF` | Video RAM                         |
| `A000` to `BFFF` | Cartridge RAM, if present         |
| `C000` to `DFFF` | Work RAM                          |
| `E000` to `FDFF` | Mirror of work RAM on hardware    |
| `FE00` to `FE9F` | Sprite attributes                 |
| `FF00` to `FF7F` | Device registers                  |
| `FF80` to `FFFE` | High RAM                          |
| `FFFF`           | Interrupt enable register         |

There are also unusable ranges between these. [Pan Docs has the full hardware memory map](https://gbdev.io/pandocs/Memory_Map.html); the table shows which part of gmboy handles each range, not every access rule.

One example of a gap: gmboy's echo-RAM range returns zero and ignores writes, while on hardware it mirrors work RAM. It's a small difference in the code, but software that uses that range will behave differently.

## Keep the CPU behind the bus

A teaching example of a load from memory:

```c
u16 address = cpu_read_reg(RT_HL);
u8 value = bus_read(address);
cpu_set_reg(RT_A, value);
```

The CPU never touches the cartridge buffer or a PPU array directly, so overlays, side effects and access restrictions all live in one place.

It also makes testing easier. CPU tests can use a fake bus, and bus tests can check address boundaries without decoding instructions.

One caveat: other devices may need different access from the CPU. If you later block CPU reads of video RAM during rendering, the PPU still has to read its own data. A single `bus_read()` is fine to start with, but it shouldn't imply every device has the same permissions.

## Tracing a write to a device

A write to `0xFF46` goes:

```text
CPU instruction
  bus_write(0xFF46, value)
    io_write(...)
      lcd_write(...)
        dma_start(value)
```

That isn't `memory[address] = value`. It starts a transfer that carries on over the following cycles.

Other registers work the same way. `0xFF00` selects which joypad lines to read, writing `0xFF04` resets the divider, `0xFF50` turns off the boot ROM, and the audio registers go to the APU.

This is memory-mapped I/O: devices controlled with the same reads and writes as memory.

## Byte order

The CPU works with some 16-bit values, but the bus moves one byte at a time. `bus_read16()` reads the low byte first, then the high byte.

For `0x34` followed by `0x12`:

```text
value = 0x34 | (0x12 << 8)
      = 0x1234
```

This is little-endian order in emulated memory. It says nothing about the host's byte order or how C lays out structures.

gmboy's `bus_write16()` writes the high byte first. The memory ends up with the right contents, but the order of bus accesses differs from hardware. That order matters once you start modelling individual cycles, so it's worth checking separately from the final values.

## Loading a cartridge

[`cart.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cart.c) reads the file, keeps its bytes and reads the header near `0x0100`, which includes the cartridge type and the ROM and RAM sizes.

It reads the header by casting a pointer into the byte buffer to a `rom_header` structure. That's short, but it's safer to read each field at its offset with bounds checks: a short file might not contain a full header, and a C structure's layout isn't the file format.

The loader also writes a terminator into the title bytes. Copying the title into a separate, bounded string would leave the cartridge data unchanged.

A safer loader would:

1. Open the file in binary mode.
2. Get and check the actual file size.
3. Reject files too short for the fields it reads.
4. Read each header field explicitly.
5. Check the mapper type and sizes are supported.
6. Allocate memory and check that it succeeded.
7. Compare the computed header checksum with the stored one.

gmboy doesn't do the last step properly. It computes a checksum, then prints a pass or fail based on whether the low byte is non-zero, instead of comparing it with the checksum in the header. The message can say "passed" for a corrupt header.

## Bank switching

Cartridges can be bigger than the address range the CPU can see, so they use banks.

A memory bank controller (MBC) chooses which part of the cartridge appears in that range. gmboy recognises the MBC1 types and keeps a pointer to the selected upper ROM bank.

For example, selecting bank 2 maps CPU address `0x4000` to this file offset:

```text
bank start = 2 × 0x4000 = 0x8000
within-bank offset = 0x4000 - 0x4000 = 0
file offset = 0x8000
```

Writing to a ROM address changes the mapper's state; it doesn't change the ROM.

[Full MBC1 behaviour](https://gbdev.io/pandocs/MBC1.html) combines a lower bank register, a second register and a mode bit. gmboy implements part of it: the upper-bank pointer uses only the lower register, and the lower ROM range never changes. Large cartridges won't work fully, despite the MBC1 label.

The bank-zero check has an ordering bug. The code turns a zero into one before masking the value to five bits, so a value like `0x20` passes the check and then becomes zero. The rules need to be applied, and tested, in the right order.

## Save files

Battery-backed RAM is saved to `.battery` files. gmboy writes one 8 KiB RAM bank: the selected one. That doesn't save the other banks, and the file doesn't record which bank it holds.

A better save format would include every bank in a fixed order, check that reads and writes succeed, and avoid replacing a good save with a half-written one.

## Exercises

Write boundary tests for the addresses on either side of each range in the table. Then build a fake cartridge where each bank is filled with a different value. Reading the same CPU address after switching banks should give a predictable result.

These tests catch routing and banking bugs before a game's code makes them hard to diagnose.

## Continue the series

[Previous: The parts of the machine](/blog/game-boy-emulator-01-foundations/). [Next: Executing instructions](/blog/game-boy-emulator-03-cpu/).

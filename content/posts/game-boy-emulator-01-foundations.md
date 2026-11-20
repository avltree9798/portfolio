---
title: 'Game Boy emulator 1: a machine in miniature'
date: '2026-11-20'
summary: 'Start with an ordinary software engineer’s mental model, then connect the CPU, memory, graphics and audio around a shared clock.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 1 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

You do not need an electrical engineering background to begin an emulator. You need a willingness to make state explicit and to ask what happens next.

Imagine a small service with a fixed amount of memory, a handful of mutable variables and a program that updates them. Now add a display and a sound generator that observe those variables as time advances. That is a useful first model of the Game Boy.

The difficult part is that those observers do not wait for an entire program to finish. They keep running while the CPU executes. A write that happens before a particular display tick can produce a different result from the same write a few ticks later.

That makes an emulator an unusually approachable introduction to systems work. It gives us a bounded machine in which interfaces, scheduling, representation and observability all matter.

## What we are building

`gmboy` is a C application with an SDL2 front end. Its source is small enough to trace across files, but substantial enough to include a CPU, a cartridge interface, graphics, input and audio.

This series explains that implementation and uses its limitations as learning opportunities. It is not a claim of complete hardware compatibility. A program reaching a title screen, for example, would not establish that every instruction or timing edge is correct.

For this series, think of the target as the original monochrome Game Boy, often called the DMG. The boot ROM loader contains some colour-model handling, but that does not turn the rest of the emulator into a complete colour-model implementation.

## Translate unfamiliar nouns into familiar responsibilities

| Component      | Software responsibility                     | State it owns                          |
| -------------- | ------------------------------------------- | -------------------------------------- |
| CPU            | Execute the next instruction                | Registers, program counter, flags      |
| Bus            | Route an address to the right device        | The routing rules                      |
| Cartridge      | Expose program data and optional saved data | ROM and banking state                  |
| PPU            | Produce display pixels over time            | Video RAM, scanline and pixel pipeline |
| Timer          | Derive counters from the machine clock      | Divider and timer registers            |
| APU            | Generate audio signals                      | Channel timers and mixer state         |
| Host front end | Present output and collect input            | SDL windows, events and audio device   |

A register is simply a small named storage location. The program counter, `PC`, records where the CPU will fetch its next instruction. A bus is the interface through which components access the machine’s address space. An interrupt is a request for the CPU to run a handler when the relevant controls permit it.

Those definitions are deliberately mechanical. They become less mysterious when we can point to the C fields that hold them.

## A small C reading key

If your usual language is Python, TypeScript or Java, a few C conventions will help you follow the examples:

- `u8` and `u16` are this project’s aliases for unsigned integers with eight and sixteen bits.
- A structure groups named fields, much like a small record.
- A pointer such as `cpu_context *ctx` refers to a structure stored elsewhere. `ctx->regs` accesses its `regs` field.
- `&` combines matching one bits, `|` combines either one bit, and `<<` or `>>` shifts bits left or right. In an address calculation, `value << 8` moves a byte into the upper half of a 16-bit value.
- A file-level `static` object keeps state private to that C file. A `static` function is also private to its translation unit.

You do not need to memorise C’s entire type system. Focus on the width of a value, who owns its storage and which function is allowed to change it.

## Start at the real entry point

Open [the entry point](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/gmboy/main.c). It delegates immediately to `emu_run()`.

Follow that call into [the emulator coordinator](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/emu.c). The startup sequence is:

1. Check that a cartridge path was supplied.
2. Optionally load a boot ROM.
3. Load the cartridge.
4. Initialise the SDL user interface, which also initialises audio.
5. Start a CPU worker thread.
6. Keep processing host events and presenting newly completed frames.

The worker initialises the timer, CPU and PPU before repeatedly calling `cpu_step()`.

Notice the distinction between ownership and coordination. The coordinator starts the components, but it does not decode an instruction or choose a tile. That division keeps individual files understandable.

## A clock is an input to the system

The most important function to read early is `emu_cycles()`.

Its argument counts CPU machine cycles. For each requested machine cycle, it performs four smaller ticks. Each smaller tick advances the timer, PPU and APU. DMA advances once after those four ticks.

```text
one machine cycle
  tick 1: timer, PPU, APU
  tick 2: timer, PPU, APU
  tick 3: timer, PPU, APU
  tick 4: timer, PPU, APU
  DMA step
```

This gives the machine a shared notion of progress. A CPU handler cannot consume time without the display and sound generators also advancing.

A useful analogy is an event-driven simulation. The clock does not ask the operating system to sleep after every instruction. It advances a model. The front end can regulate how quickly that model runs relative to a person watching the screen.

In part 4 we will trace the exact distinction between these machine cycles, individual ticks and wall-clock milliseconds.

## Build the boundary before the details

The checked-in [Makefile](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/Makefile) compiles the C files into `build/gmboy`. It links SDL2, SDL2_image and SDL2_ttf using specific Homebrew installation paths.

That is a property of this snapshot, not a portable dependency discovery mechanism. On another machine, inspect and adapt the include and library paths before expecting `make` to work. Installing a newer SDL package does not guarantee the versioned paths in that file will exist.

The intended invocation is:

```sh
make
./build/gmboy roms/example.gb
```

With an independently supplied boot ROM:

```sh
./build/gmboy roms/example.gb /path/to/bootrom.bin
```

Use a small homebrew or diagnostic program while learning. You want to understand what the program is asking the hardware to do. Neither this series nor the portfolio distributes game or boot ROM binaries.

We are reading the checked-in source, not reporting a newly measured compatibility result or claiming these commands were tested across platforms.

## Booting and starting after boot are different contracts

With a boot ROM present, [CPU initialisation](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu.c) starts `PC` at `0x0000`. Without one, it seeds a selection of post-boot values and starts at `0x0100`.

`0x` introduces a hexadecimal number. Each hexadecimal digit represents four bits, so `0x0100` is decimal 256. We will use hexadecimal because it exposes the structure of addresses and bit fields clearly.

The bus consults the boot ROM before the cartridge. Initially, the same address can therefore refer to boot code rather than game code. A write through the boot-control register later removes that overlay.

This is an important systems idea: an address does not necessarily identify one immutable physical resource. Its interpretation can depend on device state.

The current boot support also contains a limitation worth noticing early. The loader accepts a particular colour-model size and mapping, while the graphics and memory system remain primarily DMG-oriented. Treat a feature’s integration path as evidence of support, rather than relying only on its name.

## Your first investigation

Before implementing an instruction, draw the following call path on paper:

```text
main
  emu_run
    ui_init
      apu_init
    CPU worker
      timer_init
      cpu_init
      ppu_init
      cpu_step
        emu_cycles
```

Then answer three questions:

- Which thread writes the display buffer?
- Which thread reads it?
- What prevents those accesses from overlapping?

The snapshot has shared fields and buffers, but no explicit synchronisation around that hand-off. That is a source-level concern, not evidence that every run will visibly fail. We will return to a safer frame ownership model in part 8.

## Checkpoint

You should now be able to explain why an emulator needs more than an instruction interpreter, identify the host-facing boundary, and follow one unit of emulated time across the components.

The next step is to give those components a common address space.

## Continue the series

[Next: Memory is an interface](/blog/game-boy-emulator-02-memory/).

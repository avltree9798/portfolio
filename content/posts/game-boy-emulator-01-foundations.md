---
title: 'Game Boy emulator 1: the parts of the machine'
date: '2026-11-20'
summary: 'A tour of the CPU, memory, graphics and audio, and the shared clock that keeps them in step.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 1 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

A good first model of the Game Boy is a small program with a fixed amount of memory and a handful of variables it keeps updating, plus a display and a sound generator that read those variables as time passes.

The catch is that the display and sound don't wait for the program to finish anything. They run alongside the CPU, so a write that lands just before a particular display tick can give a different result from the same write a few ticks later. Most of the work in an emulator comes from getting that timing right.

## What gmboy contains

`gmboy` is a C application with an SDL2 front end. The source is small enough to follow from file to file, but it still has a CPU, a cartridge interface, graphics, input and audio.

The series explains that implementation, including where it falls short. It doesn't claim full hardware compatibility: a game reaching its title screen, for example, doesn't prove every instruction or timing detail is right.

The target is the original monochrome Game Boy, often called the DMG. The boot ROM loader handles some colour-model cases, but the rest of the emulator is DMG-only.

## The components, in software terms

| Component      | What it does                             | State it owns                          |
| -------------- | ---------------------------------------- | -------------------------------------- |
| CPU            | Executes the next instruction            | Registers, program counter, flags      |
| Bus            | Routes an address to the right device    | The routing rules                      |
| Cartridge      | Provides program data and optional saves | ROM and banking state                  |
| PPU            | Produces display pixels over time        | Video RAM, scanline and pixel pipeline |
| Timer          | Derives counters from the machine clock  | Divider and timer registers            |
| APU            | Generates audio                          | Channel timers and mixer state         |
| Host front end | Shows output and collects input          | SDL windows, events and audio device   |

A register is a small named storage location. The program counter, `PC`, holds the address of the next instruction. The bus is how components read and write the machine's address space. An interrupt is a request for the CPU to run a handler, which it does only when the relevant settings allow.

Each of these maps to fields in a C structure, which we'll look at as we go.

## Reading the C

If you usually write Python, TypeScript or Java, these conventions will help:

- `u8` and `u16` are this project's names for 8-bit and 16-bit unsigned integers.
- A structure groups named fields, like a small record.
- A pointer such as `cpu_context *ctx` refers to a structure stored elsewhere; `ctx->regs` reads its `regs` field.
- `&` keeps bits set in both values, `|` keeps bits set in either, and `<<` and `>>` shift bits left or right. `value << 8` moves a byte into the upper half of a 16-bit value.
- A `static` variable or function at file level is private to that C file.

For each value, it's enough to know how wide it is, who owns it and which functions change it.

## The entry point

[`main.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/gmboy/main.c) calls `emu_run()` straight away.

[`emu.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/emu.c) then:

1. Checks that a cartridge path was given.
2. Loads a boot ROM, if one was given.
3. Loads the cartridge.
4. Starts the SDL user interface, which also starts audio.
5. Starts a CPU worker thread.
6. Loops, handling host events and drawing each finished frame.

The worker sets up the timer, CPU and PPU, then calls `cpu_step()` repeatedly.

`emu.c` starts the components but leaves the details to them: it never decodes an instruction or picks a tile. That split is what keeps each file small enough to read.

## The shared clock

The most important function to read early is `emu_cycles()`.

Its argument is a number of CPU machine cycles. Each machine cycle is four smaller ticks, and each tick advances the timer, PPU and APU. DMA advances once after the four ticks.

```text
one machine cycle
  tick 1: timer, PPU, APU
  tick 2: timer, PPU, APU
  tick 3: timer, PPU, APU
  tick 4: timer, PPU, APU
  DMA step
```

Because every instruction reports its time through this function, the CPU can't move forward without the display and sound moving forward too.

This works like a simulation: advancing the clock updates the model rather than waiting in real time. Matching the speed a person sees on screen is the front end's job. Part 4 covers machine cycles, ticks and real time in detail.

## Building it

The [Makefile](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/Makefile) compiles the sources into `build/gmboy` and links SDL2, SDL2_image and SDL2_ttf from fixed Homebrew paths.

Those paths are hard-coded, so on another machine you'll need to edit the include and library paths first. A newer SDL install won't necessarily put files where the Makefile expects them.

```sh
make
./build/gmboy roms/example.gb
```

With a boot ROM you supply yourself:

```sh
./build/gmboy roms/example.gb /path/to/bootrom.bin
```

While learning, use a small homebrew or test program so you can tell what it's asking the hardware to do. This series doesn't provide game or boot ROM files, and I haven't tested these commands on other platforms.

## Starting with and without a boot ROM

With a boot ROM, [CPU initialisation](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu.c) starts `PC` at `0x0000`. Without one, it sets the registers to the values the boot ROM would have left and starts at `0x0100`.

`0x` marks a hexadecimal number. Each hex digit is four bits, so `0x0100` is 256 in decimal. Hex makes the structure of addresses and bit fields easier to see, so the series uses it throughout.

The bus checks the boot ROM before the cartridge, so at first the low addresses return boot code instead of game code. Writing to the boot-control register later switches that off.

So the same address can mean different things depending on device state. Part 2 builds on this.

The boot ROM loader accepts one colour-model file size and layout, but graphics and memory are still DMG-only. A feature's name in the code isn't proof it's supported end to end; follow where it's actually used.

## Exercise: trace the threads

Before implementing any instructions, sketch this call path:

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

Then answer:

- Which thread writes the display buffer?
- Which thread reads it?
- What stops them doing both at once?

In this snapshot, nothing does: the threads share fields and buffers without any locking around the hand-off. That doesn't mean every run will visibly break, but it is a real problem. Part 8 replaces it with a safer way to pass frames between threads.

## Summary

An emulator needs more than an instruction interpreter. You should now be able to point to where the emulator meets the host, and follow one unit of emulated time through every component.

Next, those components need a shared address space.

## Continue the series

[Next: Memory and the bus](/blog/game-boy-emulator-02-memory/).

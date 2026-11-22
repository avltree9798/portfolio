---
title: 'Building a Game Boy emulator in C'
date: '2026-11-20'
summary: 'An eight-part introduction to computer systems for software engineers, using the CPU, memory, graphics and audio of my gmboy emulator.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

A Game Boy is small enough to understand completely, but building an emulator for it raises the same questions as much bigger software: which component owns this state, how does a request reach the right place, what happens when two things run at once, and how do you know the result is right?

This series is for software engineers who are comfortable with functions, arrays and debugging, but haven't worked with CPU instructions, hardware registers or device timing. You don't need to know assembly or electronics.

It follows [my gmboy repository](https://github.com/avltree9798/gmboy), an emulator written in C with SDL2. Each chapter explains one part of the machine, walks through gmboy's code for it with a worked example, and ends with exercises you can turn into tests.

## Chapters

1. [The parts of the machine](/blog/game-boy-emulator-01-foundations/): the CPU, memory, graphics and audio, and the shared clock that keeps them in step.
2. [Memory and the bus](/blog/game-boy-emulator-02-memory/): the memory bus, memory-mapped devices, loading cartridges and bank switching.
3. [Executing instructions](/blog/game-boy-emulator-03-cpu/): registers, decoding, operands, arithmetic flags, branches and the stack.
4. [Timers and interrupts](/blog/game-boy-emulator-04-time/): emulated time versus real time, the timer, interrupts and HALT.
5. [Tiles, palettes and the display](/blog/game-boy-emulator-05-pixels/): decoding tiles, scrolling the background and stepping the LCD through a frame.
6. [The pixel pipeline, sprites and DMA](/blog/game-boy-emulator-06-pipeline/): the pixel FIFO, sprite selection and priority, the window layer and OAM DMA.
7. [Audio](/blog/game-boy-emulator-07-audio/): the pulse, wave and noise channels, converting ticks to samples, and the audio callback.
8. [Input, tracing and testing](/blog/game-boy-emulator-08-verification/): SDL and the joypad, clean shutdown, tracing, and a testing plan.

## How to read it

Read chapter 1 first; it gives you the overall map. For the rest, keep the linked source files open alongside and follow one operation from start to finish.

The examples use hexadecimal addresses and short C snippets. Terms like bit planes, active-low inputs, interrupt flags and sample-rate conversion are explained when they first come up. Each chapter covers the main behaviour before the less common edge cases.

The exercises are suggestions. The repository doesn't have an automated test suite yet.

## The source version

All code links point to [`c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab), the commit titled `Implement APU`, so they stay accurate if the main branch changes.

gmboy is a learning project and doesn't implement all of the hardware's behaviour. The chapters point out where the code differs from the hardware and suggest fixes. A comment, a register that looks supported or a game that starts up isn't treated as proof that something works.

## References

The source is the reference for what gmboy does. [Pan Docs](https://gbdev.io/pandocs/) is the reference for how the hardware behaves, and [RGBDS's instruction reference](https://rgbds.gbdev.io/docs/gbz80.7) is handy for looking up individual instructions. Each chapter links to the sections it uses.

The series covers the original monochrome Game Boy (DMG). There are a few colour-model fields in the repository, but no full Game Boy Color support.

Start with [The parts of the machine](/blog/game-boy-emulator-01-foundations/).

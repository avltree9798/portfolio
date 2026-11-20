---
title: 'Building a Game Boy emulator in C'
date: '2026-11-20'
summary: 'An eight-part introduction to computer systems for software engineers, following the CPU, memory, graphics and audio of my gmboy project.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

A Game Boy emulator is a small enough system to understand end to end, but it asks the same questions as much larger software: who owns this state, how does an operation reach the right component, what happens when two activities overlap, and how can we tell whether the result is correct?

This series is for software engineers who are comfortable with functions, arrays and ordinary debugging, but have not yet worked closely with CPU instructions, hardware registers or device timing. You do not need to know assembly language or electrical engineering before starting.

We follow [my gmboy repository](https://github.com/avltree9798/gmboy), a C and SDL2 emulator. Each chapter introduces a systems idea, traces the relevant implementation, works through a concrete example and finishes with checks you can turn into tests.

## Read in order

1. [A machine in miniature](/blog/game-boy-emulator-01-foundations/): Start with an ordinary software engineer’s mental model, then connect the CPU, memory, graphics and audio around a shared clock.
2. [Memory is an interface](/blog/game-boy-emulator-02-memory/): Build a memory bus, understand memory-mapped devices, load cartridge data and reason about bank switching.
3. [Teaching a CPU to execute](/blog/game-boy-emulator-03-cpu/): Follow an instruction through registers, decoding, operand fetching, arithmetic flags, branches and the stack.
4. [Time, timers and interrupts](/blog/game-boy-emulator-04-time/): Separate emulated time from wall-clock time and make timer edges, interrupt requests and halted execution fit together.
5. [From bytes to a picture](/blog/game-boy-emulator-05-pixels/): Decode tile graphics, map a scrolling background and follow the LCD through a complete frame.
6. [Pixels arriving on time](/blog/game-boy-emulator-06-pipeline/): Build a pixel FIFO, select sprites, position a window and move sprite data through DMA.
7. [Making the machine audible](/blog/game-boy-emulator-07-audio/): Generate pulse, wave and noise signals, convert emulated ticks into audio samples and handle the audio callback boundary.
8. [Making an emulator trustworthy](/blog/game-boy-emulator-08-verification/): Connect SDL and input, build useful traces and turn an experimental emulator into a system you can test and explain.

## How to use the series

Read the first chapter before opening every source file. It gives you the map. After that, keep the chapter’s linked source files open beside the explanation and follow one operation all the way through.

The examples use hexadecimal addresses and small C fragments. New concepts such as bit planes, active-low inputs, interrupt flags and sample-rate conversion are introduced where they become useful. The goal is to make the mechanism understandable before adding its less common edge cases.

The checkpoints are proposed exercises. They are not claims that the repository already contains a passing automated suite.

## What the source snapshot establishes

The implementation links are pinned to [`c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab), the revision titled `Implement APU`. That gives the discussion a stable reference even if the default branch changes.

The project is an educational implementation with incomplete hardware behaviour. The chapters distinguish the active code path, the intended hardware mechanism and a suggested improvement. In particular, a comment, a supported-looking register or a successful startup message is not treated as proof of complete compatibility.

The chapters follow a teaching order, with a stable source revision and explicit validation checkpoints. Treat the proposed tests as a plan for establishing behaviour, rather than a compatibility report for the current implementation.

## Useful references

The source is the reference for what this implementation does. [Pan Docs](https://gbdev.io/pandocs/) is a reference for Game Boy hardware behaviour, and [RGBDS’s instruction reference](https://rgbds.gbdev.io/docs/gbz80.7) is useful when looking up individual instructions. The chapters link to the specific material they discuss.

We use a DMG-oriented model throughout. Mentions of colour-model fields in the repository do not imply a complete colour implementation.

Begin with [A machine in miniature](/blog/game-boy-emulator-01-foundations/).

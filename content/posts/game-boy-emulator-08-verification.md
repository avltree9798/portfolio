---
title: 'Game Boy emulator 8: input, tracing and testing'
date: '2026-11-20'
summary: 'Connecting SDL and the joypad, shutting down cleanly, tracing, and a plan for testing the emulator.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 8 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

The last part of the emulator is the host computer: windows, keyboard events, audio callbacks and files. None of it is part of the Game Boy, but it decides whether the emulator is pleasant and reliable to use.

This chapter covers that layer, then turns the exercises from earlier chapters into a testing plan.

## Drawing the frame

[The SDL front end in `ui.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ui.c) reads the PPU's finished pixels, draws each one as a scaled rectangle on a surface, uploads the surface to a texture and shows it.

The image is 160 by 144. gmboy scales it by four, to 640 by 576, but the window is 1024 by 768, so the two sizes don't match.

It would be better to choose a presentation explicitly: an exact integer scale, a centred image with borders, or a resizable window that keeps the aspect ratio. That's a front-end decision; the PPU's coordinates shouldn't change.

Uploading the whole framebuffer at once would avoid drawing a separate rectangle for every pixel. Get the output right first, then measure, rather than guessing that the CPU decoder is the slow part.

## Passing frames between threads

The CPU thread writes the framebuffer and a frame counter, and the main thread reads them.

A changed counter tells the main thread a new frame exists, but it doesn't make reading the buffer safe. Without locking, there's a data race, even if tearing is hard to reproduce.

A teaching double-buffer design:

```text
worker owns back buffer
worker finishes a frame
worker publishes which buffer is complete
renderer takes that buffer
renderer owns it while drawing
worker carries on with a different buffer
```

This needs more than two arrays. The hand-off needs a mutex or a correct atomic protocol, and the worker mustn't reuse a buffer the renderer still has. Being told a frame is ready isn't the same as owning it; the same problem comes up with queues, caches and async services.

## The joypad

The SDL handler maps `Z` to B, `X` to A, Return to Start, Tab to Select and the arrow keys to the D-pad, and updates the controller state on both key-down and key-up.

[`joypad.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/joypad.c) exposes that state as active-low bits: a pressed button clears its bit rather than setting it.

Software writes selection bits to choose the buttons or the D-pad, then reads the low bits. The key event and the register read don't happen at the same time.

gmboy uses `else if` within each group, so if two buttons in a group are held, only one of them clears its bit.

A teaching fix:

```c
if (state.start)  output &= ~(1 << 3);
if (state.select) output &= ~(1 << 2);
if (state.b)      output &= ~(1 << 1);
if (state.a)      output &= ~(1 << 0);
```

These checks go inside the button-group case. A full implementation also keeps the selection and unused bits correct and raises joypad interrupts, which gmboy doesn't do.

## Shutting down

Closing the window sets the `die` flag, destroys the SDL window and calls `SDL_Quit()`.

The worker thread, though, checks a different flag, `running`. The coordinator doesn't wait for the worker to finish before returning, and the close path doesn't close the audio device or free everything.

A safer shutdown would:

1. Signal the worker to stop, using proper synchronisation.
2. Let the worker stop touching shared state.
3. Join the worker thread.
4. Stop and close the audio device.
5. Save any cartridge data that needs saving.
6. Free textures, surfaces, windows and emulator memory.
7. Shut SDL down.

The order follows who owns what. The rule is that nothing is destroyed while another thread can still use it.

## CPU traces

A useful CPU trace line has the program counter, the opcode bytes, the decoded instruction, the relevant registers and flags, and the tick count.

gmboy has trace code, but it's behind the `CPU_DEBUG` macro, which `cpu.c` defines as zero. Setting a `DEBUG` environment variable, as the project notes suggest, does nothing in this snapshot.

To get traces, change the macro locally and rebuild. A command-line option would be a nice addition, but it doesn't exist yet. It's worth checking that a debug setting is actually read before trusting that it's on.

## The debug views

The SDL debug window decodes tiles separately from the real pixel pipeline, which helps tell bad tile data apart from bad map selection.

But it combines the two bit planes the opposite way round from the pipeline, so the viewer and the screen can disagree because of a bug in the viewer. Test it with the same known row from part 5; debug tools are code too.

The serial debug helper grabs a byte when the serial control register is `0x81` and appends it to a fixed-size buffer. It only runs inside the compile-time debug block, not as a real serial device.

That's enough for some test ROMs that print over serial, but it isn't a full serial implementation, and the buffer needs a bounds check before you feed it arbitrary output.

## A testing plan

The repository has no automated tests and no compatibility report. This is a suggested order, not results.

| Layer            | Example tests                             | What it checks                 |
| ---------------- | ----------------------------------------- | ------------------------------ |
| Data formats     | Register pairs, tile rows, palette fields | Bit and byte handling          |
| Device behaviour | Timer edges, bank writes, DMA steps       | Each component's state machine |
| Single CPU steps | Opcode, operands, flags, cycles           | Instruction behaviour          |
| Combined traces  | Interrupt entry during timed code         | Order between components       |
| Test ROMs        | CPU, timer, graphics and audio tests      | Behaviour a program can see    |
| Host integration | Buffer ownership, input, shutdown         | Threads and host resources     |

Start with tests that don't need SDL. Then add a headless runner that loads a test ROM, runs for a fixed number of ticks and reports the result.

Give the runner a timeout, so a test that never reports completion fails with a trace instead of running forever.

## Finding the first difference

When a test fails, look for the first point where the state differs from what's expected. A corrupt final frame can be thousands of instructions after a wrong half-carry flag.

Good things to compare:

- The first instruction trace line that differs.
- The first timer increment at the wrong tick.
- The first line whose mode changes differ.
- The first point where the audio sample count drifts.

Record the starting state, the source revision and the exact test ROM with each result, or you won't be able to reproduce it.

[Mooneye's test suite](https://github.com/Gekkio/mooneye-test-suite) has focused hardware tests. Read how each one reports pass or fail rather than assuming a picture on screen means it passed. Comparing with another emulator helps, but other emulators get some quirks wrong too.

## What I'd do next

First, I'd add tests around the bugs found in this series: the timer overflow check, the SBC carry case, palette extraction and holding two buttons at once. Each is small enough to check without a game.

Then I'd work on register pairs without host assumptions, cartridge bounds and banking, interrupt timing, different memory access for different devices, and safe frame and audio hand-offs between threads.

Only after that would I make claims about performance or compatibility.

## Summary

Most of the ideas in this series show up in larger systems too: the bus is an interface with side effects, the decoder is an interpreter, the pixel FIFO is a bounded pipeline, the audio queue is a producer and consumer, and the frame hand-off is a question of ownership. The Game Boy is small enough that you can follow a byte in the cartridge all the way to a pixel or a sample on your computer.

## Continue the series

[Previous: Audio](/blog/game-boy-emulator-07-audio/). Back to the [series guide](/blog/building-a-game-boy-emulator/).

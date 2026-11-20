---
title: 'Game Boy emulator 8: making an emulator trustworthy'
date: '2026-11-20'
summary: 'Connect SDL and input, build useful traces and turn an experimental emulator into a system you can test and explain.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 8 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

The final boundary is the host computer. It supplies windows, keyboard events, audio callbacks and files. None of those services is part of the emulated Game Boy, but all of them affect whether the emulator is pleasant and dependable to use.

This chapter connects that boundary and turns the earlier checkpoints into a verification strategy.

## Present a framebuffer rather than reimplementing the PPU

[The SDL front end](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ui.c) reads the PPU’s completed pixels and fills scaled rectangles into a host surface. It uploads that surface to a texture and presents it.

The emulated image remains 160 by 144 pixels. With the source’s scale factor of four, its drawn region is 640 by 576 pixels. The host window constants are 1024 by 768, so those dimensions are not currently the same contract.

A useful refinement would define the desired presentation explicitly: an exact integer-scaled image, a centred image with borders, or a resizable window with a preserved aspect ratio. That should be a front-end decision, not a change to the PPU’s coordinate system.

For performance, uploading a prepared framebuffer can avoid issuing a separate rectangle operation for every source pixel. Measure that change after establishing correct output, rather than guessing that the CPU decoder must be the bottleneck.

## Frame completion needs ownership

The CPU worker updates the framebuffer and frame counter while the main thread reads them.

A counter changing is a useful notification, but it does not by itself establish that another thread can safely read the associated buffer. Without synchronisation, the code can have data races even if tearing is difficult to reproduce.

A teaching double-buffer model is:

```text
worker owns back buffer
worker finishes a frame
worker publishes completed-buffer identity
renderer acquires that identity
renderer owns the published buffer while presenting it
worker continues with a different buffer
```

Implementing that model requires more than two arrays. The hand-off needs a mutex or a correct atomic publication protocol, and the worker must not reuse a buffer while the renderer still owns it.

That is the same lifetime question encountered in queues, caches and asynchronous services: notification is not ownership.

## Input is a register view of host state

The SDL handler maps `Z` to B, `X` to A, Return to Start, Tab to Select and the arrow keys to directions. It updates the controller state on both key-down and key-up events.

[The joypad module](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/joypad.c) exposes that state through a selected group of active-low bits. Active-low means that a pressed input clears a bit rather than setting it.

Software writes selection bits to choose button and direction groups, then reads the low bits to discover the selected inputs. The host event and the emulated register read need not happen at the same moment.

The current implementation uses `else if` within each group. Consequently, simultaneously pressed buttons in that group do not all clear their corresponding bits.

Teaching correction to the combination step:

```c
if (state.start)  output &= ~(1 << 3);
if (state.select) output &= ~(1 << 2);
if (state.b)      output &= ~(1 << 1);
if (state.a)      output &= ~(1 << 0);
```

Those checks belong inside the selected-button-group case. The complete register implementation also needs to preserve the appropriate selection and unused bits, and model the relevant interrupt transitions. The current module does not request joypad interrupts.

## Shutdown is part of correctness

Closing a window sets the coordinator’s `die` flag, destroys the main SDL window and calls `SDL_Quit()`.

The worker loop, however, watches a different `running` flag. The current coordinator does not join that worker before returning, and the shown close path does not explicitly close the audio device or free all device resources.

A more deliberate shutdown sequence would:

1. Publish a stop request through a synchronised mechanism.
2. Allow the worker to stop accessing shared state.
3. Join the worker thread.
4. Stop and close the audio device.
5. Persist any required cartridge data.
6. Release textures, surfaces, windows and emulator allocations.
7. Shut SDL down.

The exact ordering follows resource ownership. The important property is that a resource is not destroyed while another thread can still access it.

## Make the trace describe the machine

A CPU trace should contain the program counter, opcode bytes, decoded operation, relevant registers, flags and emulated tick count.

The source has such trace code, but it is guarded by the compile-time `CPU_DEBUG` macro, defined as zero in `cpu.c`. Setting an environment variable called `DEBUG` does not change that macro in this snapshot, even though the project notes suggest environment-variable commands.

To investigate this code, enable the compile-time path in a local debugging change and rebuild. A future implementation could introduce an explicit run-time option, but that is not already present.

This distinction prevents a surprisingly common debugging failure: assuming that a command activated instrumentation when no output path reads the setting.

## Use the debug view as evidence, not decoration

The SDL debug window decodes tile data independently of the final pixel pipeline. That can help separate bad source graphics from bad map selection.

However, the current tile viewer combines the two bit planes with the opposite significance from the active pipeline. The viewer can therefore disagree with the display for a reason inside the debugging tool.

Test diagnostic helpers with the same known row used in part 5. A tool that visualises state is still code, and its interpretation needs verification.

The serial debug helper also deserves attention. It captures a byte when the serial control register equals `0x81`, then appends it to a fixed-size message buffer. It is invoked from the compile-time debug block, not from an always-on serial device model.

That is useful for some diagnostic ROM conventions, but it is not a complete serial transfer implementation. Bounds checks are also required before treating an arbitrary diagnostic program as an unlimited source of trace text.

## Build a test ladder

The repository snapshot has no checked-in automated test suite or demonstrated compatibility report. The following is a proposed ladder, not a list of results already achieved.

| Layer               | Example checks                            | What it isolates               |
| ------------------- | ----------------------------------------- | ------------------------------ |
| Pure representation | Register pairs, tile rows, palette fields | Bit and byte interpretation    |
| Device transitions  | Timer edges, bank writes, DMA steps       | A component’s state machine    |
| CPU single-step     | Opcode, operands, flags, cycles           | Instruction semantics          |
| Integrated traces   | Interrupt entry during timed execution    | Component ordering             |
| Diagnostic ROMs     | CPU, timer, graphics and audio tests      | Observable machine behaviour   |
| Host integration    | Buffer ownership, input, shutdown         | Threads and external resources |

Start with deterministic checks that do not need SDL. Then add a headless runner that can load a diagnostic program, advance a bounded number of ticks and report a result.

A timeout belongs in that runner. A program that never signals completion should fail with a useful trace rather than run forever.

## Compare the first divergence

When a diagnostic fails, find the earliest state that differs from the expectation. A final corrupted frame may be thousands of instructions downstream from a bad half-carry flag.

Useful comparisons include:

- The first differing instruction trace.
- The first timer increment at the wrong tick.
- The first scanline whose mode transitions differ.
- The first audio sample count that departs from the expected rate.

Keep the initial state, source revision and test binary identity with the result. Reproduction depends on all three.

[Mooneye’s test suite](https://github.com/Gekkio/mooneye-test-suite) is one possible source of focused hardware tests. Read each test’s requirements and result convention rather than assuming that a visible screen means success. A second emulator is a useful comparison tool, but it is not automatically an authority on every hardware quirk.

## A practical next iteration

For this snapshot, I would first establish instruction and device tests around the timer overflow condition, SBC carry boundary, palette extraction and combined joypad inputs. Each is small enough to reason about without a commercial game.

Then I would work on explicit register representation, mapper bounds and banking rules, interrupt timing, memory-access distinctions, and synchronised frame and audio hand-offs.

Only after those foundations would I trust broad performance or compatibility claims.

## What this project teaches beyond emulation

An emulator makes systems ideas tangible. A memory bus is an interface with side effects. An instruction decoder is an interpreter. A pixel FIFO is a bounded pipeline. An audio queue is a producer-consumer boundary. A frame hand-off is an ownership protocol. A diagnostic trace is observability tied to a deterministic clock.

You can learn each of those ideas in a much larger system. Here, the machine is small enough to follow an event from a byte in a cartridge to a pixel or sample on the host.

That is the real milestone of the series: being able to explain the complete path, identify the assumptions at every boundary, and design a test that would expose a wrong one.

## Continue the series

[Previous: Making the machine audible](/blog/game-boy-emulator-07-audio/). Return to the [series guide](/blog/building-a-game-boy-emulator/).

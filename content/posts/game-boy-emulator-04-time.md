---
title: 'Game Boy emulator 4: time, timers and interrupts'
date: '2026-11-20'
summary: 'Separate emulated time from wall-clock time and make timer edges, interrupt requests and halted execution fit together.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 4 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

A program can execute the right arithmetic and still run on the wrong machine. If its timer fires too early, its interrupts arrive at the wrong instruction, or its graphics advance at the wrong rate, the visible result can be incorrect.

This chapter introduces time as part of the emulator’s state.

## Three clocks, three responsibilities

It helps to distinguish:

- **T-cycles:** the individual ticks consumed by the emulated components.
- **M-cycles:** CPU machine cycles, each expanded into four T-cycles by this DMG-oriented implementation.
- **Host time:** milliseconds and audio deadlines on the computer running the emulator.

`emu_cycles(2)` therefore advances the timer, display and audio by eight ticks. It does not mean sleep for two milliseconds.

[The shared scheduler](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/emu.c) is intentionally simple. It loops through each tick, advances the components in a fixed order, and then steps DMA once per machine cycle.

This is easy to inspect. Later, an emulator might skip directly to the next relevant event, but that optimisation needs to preserve the behaviour of the simple model.

## Where time enters a CPU instruction

Follow `LD (HL), 0x42`:

```text
fetch opcode       1 M-cycle
fetch immediate    1 M-cycle
write destination  1 M-cycle
---------------------------
total              3 M-cycles = 12 T-cycles
```

The opcode fetch is charged by `cpu_step()`, the immediate read by `fetch_data()`, and the memory write by `proc_ld()`.

That distribution is convenient, but it also creates an accounting problem. If two layers both charge the same access, the instruction becomes too slow. If neither charges it, the instruction becomes too fast.

A per-instruction ledger is more useful than a single guessed delay added at the end. It tells you which accesses happen before a timer or display transition.

## Derive the timer from transitions

[The timer](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/timer.c) keeps a 16-bit divider and increments it every tick. The visible `DIV` register reads the upper byte.

The programmable timer selects one divider bit. The implementation checks whether that bit changed from one to zero between the previous and current divider values.

That is a falling edge. If bit 3 is selected, it falls once per 16 increments because it is low for eight values and high for eight values.

The selected bit positions are 9, 3, 5 and 7. Their falling-edge periods are 1024, 16, 64 and 256 ticks respectively.

A familiar software equivalent is deriving scheduled events from a counter, except that the transition itself matters. Merely checking whether the final divider value is divisible by a period loses information when a register write changes the counter between normal increments.

## Separate detecting an event from applying its effect

Teaching example:

```c
bool old_signal = timer_enabled(old_tac)
    && selected_divider_bit(old_div, old_tac);
bool new_signal = timer_enabled(new_tac)
    && selected_divider_bit(new_div, new_tac);

if (old_signal && !new_signal) {
    increment_tima();
}
```

The helper names describe a proposed model, not functions already present in the repository.

It exposes why writing `DIV` or changing timer selection can matter. The old and new signals can differ even though an ordinary clock tick did not occur. [Pan Docs documents these timer edge cases](https://gbdev.io/pandocs/Timer_Obscure_Behaviour.html).

The current implementation applies its falling-edge logic only inside `timer_tick()`. Its register writes assign values directly. That is a useful first model, with a clearly identified extension point.

## Overflow is a state transition

`TIMA` is the incrementing timer register. `TMA` supplies its reload value. When the timer overflows, the hardware schedules a reload and a timer interrupt, with timing details that can interact with register writes.

There is an earlier problem in this snapshot: after incrementing TIMA, it tests whether the new value is `0xFF`.

Compare two starting values:

| Starting TIMA | After an eight-bit increment | Should that increment overflow? |
| ------------- | ---------------------------- | ------------------------------- |
| `0xFE`        | `0xFF`                       | No                              |
| `0xFF`        | `0x00`                       | Yes                             |

The current condition reloads on the first row and misses the second. This can be demonstrated without running a game.

A teaching correction to the detection alone is:

```c
u8 previous = tima;
tima++;
if (previous == 0xFF) {
    /* Schedule the hardware reload sequence. */
}
```

The comment is important. Correctly detecting the overflow is not the same as implementing the complete delayed reload sequence.

## Interrupts have three gates

A device requests an interrupt by setting a bit in `IF`. Software enables particular sources through `IE`. The CPU’s internal `IME` flag controls whether enabled requests may be serviced at all.

Conceptually:

```text
pending = IF & IE & 0x1F
may enter a handler = IME and pending is not zero
```

[The interrupt code](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/interrupts.c) checks sources in priority order: VBlank, LCD status, timer, serial, then joypad. It pushes the current program counter, selects a handler address, clears the serviced request and disables further interrupt handling.

This is not an operating-system thread switch. The same emulated CPU runs a different section of the cartridge program, using its ordinary stack.

[The hardware interrupt sequence](https://gbdev.io/pandocs/Interrupts.html) also consumes five machine cycles. The snapshot’s interrupt entry does not charge those cycles. Stack writes and the handler destination can look correct while time remains wrong.

## Enabling interrupts is not always immediate

`EI` should enable interrupt handling after the following instruction. That delay is observable.

The source stores an `enabling_ime` flag, which suggests that intent. However, `cpu_step()` sets the master flag at the end of the same step that executed `EI`. Interrupt entry is checked after subsequent instruction execution rather than through an explicit before-fetch boundary.

Do not judge the implementation by the flag’s name alone. Design tests for `EI` followed by `DI`, `EI` followed by an ordinary instruction, and a request arriving while interrupts are disabled. State exactly when the request becomes eligible and when execution transfers.

This is a general systems debugging habit: make the boundary in a timing claim explicit.

## A halted CPU does not halt the world

`HALT` stops ordinary instruction execution while the rest of the machine keeps advancing. In the halted path, `cpu_step()` still calls `emu_cycles(1)`.

That is the right architectural separation. The timer can create the event that makes CPU execution interesting again.

The snapshot wakes when any interrupt flag is present. A more accurate model must distinguish enabled pending requests and the special HALT behaviours associated with IME. The hardware’s HALT bug also affects instruction fetching and is not represented by a single Boolean alone.

You do not need to implement every quirk on your first day. You do need to avoid describing a first approximation as a verified complete model.

## Checkpoint

Write down expected traces for:

1. Sixteen ticks with divider bit 3 selected.
2. A timer increment starting at `0xFE`.
3. A timer increment starting at `0xFF`.
4. A timer request while IE is clear.
5. Two simultaneously enabled interrupt requests.
6. A halted CPU while the divider keeps advancing.

A trace should include the tick number and the relevant state before and after an event. This turns vague statements such as “the timer is unreliable” into small, repeatable questions.

## Continue the series

[Previous: Teaching a CPU to execute](/blog/game-boy-emulator-03-cpu/). [Next: From bytes to a picture](/blog/game-boy-emulator-05-pixels/).

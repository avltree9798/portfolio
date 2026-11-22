---
title: 'Game Boy emulator 4: timers and interrupts'
date: '2026-11-20'
summary: 'Emulated time versus real time, the timer, interrupt requests and the HALT instruction.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 4 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

A program can do all its arithmetic correctly and still go wrong if the timer fires too early, an interrupt arrives at the wrong instruction or the graphics run at the wrong rate. This chapter treats time as part of the emulator's state.

## Three kinds of time

- **T-cycles:** the individual ticks that the components run on.
- **M-cycles:** CPU machine cycles. gmboy counts each as four T-cycles.
- **Host time:** real milliseconds and audio deadlines on your computer.

So `emu_cycles(2)` advances the timer, display and audio by eight ticks. It doesn't sleep for two milliseconds.

[The scheduler in `emu.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/emu.c) is deliberately simple: it loops over each tick, advances the components in a fixed order, and steps DMA once per machine cycle.

That makes it easy to follow. A faster emulator might jump straight to the next interesting event, but it would still need to behave exactly like this simple version.

## Counting an instruction's cycles

`LD (HL), 0x42` takes:

```text
fetch opcode       1 M-cycle
fetch immediate    1 M-cycle
write destination  1 M-cycle
---------------------------
total              3 M-cycles = 12 T-cycles
```

`cpu_step()` counts the opcode fetch, `fetch_data()` counts the immediate read, and `proc_ld()` counts the memory write.

Spreading the counting out like this is convenient, but easy to get wrong. If two places count the same access, the instruction runs slow; if neither does, it runs fast.

Listing each access and its cycle is more useful than one total added at the end, because it shows which accesses happen before a timer or display change.

## The timer

[The timer](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/timer.c) keeps a 16-bit divider and increments it every tick. The `DIV` register shows its upper byte.

The programmable timer watches one bit of the divider and counts each time that bit goes from one to zero (a falling edge).

If bit 3 is selected, it falls once every 16 increments: it's low for eight values, then high for eight.

The four selectable bits are 9, 3, 5 and 7, giving periods of 1024, 16, 64 and 256 ticks.

It has to be the transition that counts. Checking whether the divider is a multiple of the period misses cases where a register write changes the divider between normal increments.

## Checking the edge before and after a change

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

These helpers are a suggested design, not functions in gmboy.

Written this way, it's clear why writing `DIV` or changing the selected bit can increment the timer: the signal can fall without a normal tick happening. [Pan Docs covers these edge cases](https://gbdev.io/pandocs/Timer_Obscure_Behaviour.html).

gmboy only checks for the falling edge inside `timer_tick()`; register writes just set the values. That's a fine first version, and the place to extend it is clear.

## Timer overflow

`TIMA` is the counting register and `TMA` holds the value it reloads from. When `TIMA` overflows, the hardware schedules a reload and a timer interrupt, with some timing details that interact with register writes.

gmboy has a simpler bug first: after incrementing `TIMA`, it checks whether the new value is `0xFF`.

| Starting TIMA | After increment | Should it overflow? |
| ------------- | --------------- | ------------------- |
| `0xFE`        | `0xFF`          | No                  |
| `0xFF`        | `0x00`          | Yes                 |

The check fires on the first row and misses the second. You can confirm this with a unit test; no game needed.

A teaching fix for the detection:

```c
u8 previous = tima;
tima++;
if (previous == 0xFF) {
    /* Schedule the hardware reload sequence. */
}
```

This only fixes the detection. The delayed reload still needs implementing.

## Interrupts

A device requests an interrupt by setting a bit in `IF`. Software chooses which sources are enabled in `IE`. The CPU's `IME` flag controls whether it handles any interrupts at all.

```text
pending = IF & IE & 0x1F
may enter a handler = IME and pending is not zero
```

[`interrupts.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/interrupts.c) checks the sources in priority order: VBlank, LCD status, timer, serial, then joypad. It pushes the program counter, jumps to the handler address, clears the request and turns off further interrupts.

This isn't like an operating system switching threads. The same CPU just runs a different part of the cartridge program, using the normal stack.

[On hardware, entering an interrupt](https://gbdev.io/pandocs/Interrupts.html) takes five machine cycles. gmboy doesn't count them, so the stack and handler address are right but the timing isn't.

## The EI delay

`EI` should turn on interrupt handling one instruction later, and programs can depend on that delay.

gmboy has an `enabling_ime` flag that suggests the delay was intended. But `cpu_step()` sets `IME` at the end of the same step that ran `EI`, and checks for interrupts after the next instruction rather than before fetching it.

Test it rather than trusting the flag's name: `EI` then `DI`, `EI` then an ordinary instruction, and a request that arrives while interrupts are off. For each, write down exactly when the request becomes eligible and when the jump to the handler happens.

## HALT

`HALT` stops the CPU running instructions, but the rest of the machine keeps going. In the halted path, `cpu_step()` still calls `emu_cycles(1)`, so the timer can raise the interrupt that wakes the CPU up.

gmboy wakes from `HALT` when any interrupt flag is set. On hardware it depends on whether the interrupt is enabled and on `IME`, and the hardware's HALT bug also changes how the next instruction is fetched, which one Boolean can't model.

You don't need every quirk on day one. Just don't describe a first approximation as a complete model.

## Exercises

Write out the expected state, tick by tick, for:

1. Sixteen ticks with divider bit 3 selected.
2. A timer increment starting at `0xFE`.
3. A timer increment starting at `0xFF`.
4. A timer interrupt request while `IE` is clear.
5. Two enabled interrupt requests at the same time.
6. A halted CPU while the divider keeps counting.

Record the tick number and the relevant state before and after each event. That turns "the timer seems unreliable" into small tests you can repeat.

## Continue the series

[Previous: Executing instructions](/blog/game-boy-emulator-03-cpu/). [Next: Tiles, palettes and the display](/blog/game-boy-emulator-05-pixels/).

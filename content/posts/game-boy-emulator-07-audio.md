---
title: 'Game Boy emulator 7: making the machine audible'
date: '2026-11-20'
summary: 'Generate pulse, wave and noise signals, convert emulated ticks into audio samples and handle the audio callback boundary.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 7 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

Audio forces us to connect two different notions of time: millions of emulated ticks per second and a host device asking for a block of samples by a deadline.

The APU chapter is therefore about signal generation and buffering as much as it is about sound.

## Start with a signal you can print

A digital audio sample is a number representing an instantaneous signal value. A stream of those values, played at a known sample rate, becomes a changing voltage at an audio output.

For an emulator, the first task is to generate that stream from device state. The initial diagnostic does not need speakers. A sequence of sample values, or a small plotted waveform, is easier to inspect than an impression that a tone sounds wrong.

[The APU implementation](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/apu.c) receives one call to `apu_tick()` per emulated T-cycle. The front end requests a 48,000 Hz stereo SDL audio device.

## Understand the four channel families

| Channel | Generator         | Main control ideas                                           |
| ------- | ----------------- | ------------------------------------------------------------ |
| 1       | Pulse wave        | Duty pattern, period, envelope and frequency sweep           |
| 2       | Pulse wave        | Duty pattern, period and envelope                            |
| 3       | Programmable wave | A repeating sequence of four-bit samples                     |
| 4       | Noise             | A shift register producing a repeating pseudo-random pattern |

A duty pattern determines how much of a pulse wave’s repeating period is high. An envelope changes volume over time. A sweep changes a channel’s period over time.

These are separate state machines. Avoid putting all their behaviour into a function called once per host audio sample, because the emulated channel events happen at their own rates.

## Follow the active path, not the first comment

The beginning of `apu.c` describes channel 3 as stubbed, and an older helper returns zero for its output. Later in the same file, the active `apu_tick()` path advances the wave position and extracts nibbles from wave RAM. Register writes also configure and trigger it.

Calling the internal wave-generation path completely absent would therefore be inaccurate. Calling the complete channel operational would also be inaccurate. CPU writes to `0xFF30` through `0xFF3F` reach `apu_io_write()`, but its switch does not store them in wave RAM. The array remains at its reset values through that interface. The active frame sequencer also does not clock channel 3’s length counter, and its byte-sized length field cannot represent 256 directly.

This is a useful reading habit for unfamiliar systems code. Find the entry point that actually runs, follow its callees, and compare the state transitions with the comments afterwards.

The older `mix_and_push_sample()` path is also not the path used by `apu_tick()`. Explaining its helpers as if they were the current scheduler would produce the wrong timing story.

## Generate a pulse from a small table

The pulse channels select one of four eight-step duty tables. A timer controls when the duty position advances.

The source uses a timer reload derived from:

```text
ticks per duty step = (2048 - period_register) × 4
```

An eight-step waveform therefore repeats after eight such timer periods.

For a period register of 1024:

```text
step period = (2048 - 1024) × 4 = 4096 ticks
wave period = 8 × 4096 = 32,768 ticks
frequency = 4,194,304 / 32,768 = 128 Hz
```

This is a mathematical prediction from the implemented formula, not a measured audio result.

At each tick, the current duty-table entry selects either zero or the current envelope volume. That is enough to form a recognisable pulse signal before reproducing the finer analogue characteristics of the hardware.

## Slower controls share a frame sequencer

The source runs an eight-step frame sequencer, advancing every 8192 emulated ticks. Its nominal step rate is therefore 512 Hz.

Length counters advance on steps 0, 2, 4 and 6. Channel 1 sweep advances on steps 2 and 6. Envelopes advance on step 7.

Those schedules produce nominal rates of 256, 128 and 64 events per second respectively.

The real hardware ties this sequencing to divider transitions. [Pan Docs explains that connection and the analogue output stages](https://gbdev.io/pandocs/Audio_details.html). `gmboy` uses its own cycle accumulator, so resetting the timer divider does not produce every hardware APU interaction.

This is another case where the average rate can be correct while the timing relationship is incomplete.

## A wave channel packs two samples into each byte

Channel 3 owns 16 bytes of wave RAM, representing 32 four-bit samples.

Teaching extraction:

```c
u8 packed = wave_ram[position / 2];
u8 sample = (position & 1) ? (packed & 0x0F) : (packed >> 4);
```

The active source uses that idea and applies the configured output-level shift.

Do not let the `u8 length` field’s apparent range pass unnoticed. Assigning 256 to it produces zero. A model that needs both zero and 256 as distinct states requires a wider field or a carefully defined encoded representation.

In the current code, the length scheduler also omits channel 3. The right next step is a state test that triggers the channel, advances the length clock, and checks exactly when it becomes disabled.

## Noise is deterministic state, not host randomness

Channel 4 uses a linear-feedback shift register, abbreviated LFSR. The code combines two low bits with XOR, shifts the register and feeds the result back into a higher position. A short-width mode also replaces a lower feedback position.

This produces a repeatable sequence from a known initial state. Calling the host’s random-number generator would lose that relationship between device registers, phase and output.

The noise timer in this snapshot is a `u16`, while some shifted divisor values require more bits. A large shift can therefore wrap during narrowing. Test the period calculation independently before interpreting an unexpected high-frequency signal as an audio-device problem.

## Convert ticks to host samples without losing the remainder

At a sample rate of 48,000 Hz:

```text
emulated ticks per host sample = 4,194,304 / 48,000
                               ≈ 87.381333
```

That is not an integer. Always taking 87 ticks would accumulate drift.

The active source accumulates instantaneous left and right values on every tick. Once the sample accumulator reaches `cycles_per_sample`, it averages the accumulated values, emits a stereo sample and subtracts the threshold rather than discarding the remainder.

This is a simple resampling approach. It reduces the information loss of observing one arbitrary tick per sample, but it is not a complete high-quality band-limited resampler or an exact reproduction of the hardware’s analogue filtering.

## Route, scale, queue

`NR51` selects which channels contribute to the left and right outputs. `NR50` supplies master volume fields. The source sums the selected channel values, scales them and converts the result into signed 16-bit PCM values.

The CPU worker places those interleaved left and right samples into a ring buffer. SDL’s callback consumes samples when the host audio device needs them. If the buffer is empty, the callback supplies zeroes.

The snapshot’s indices are declared `volatile`. That prevents some compiler assumptions about individual accesses, but it does not supply C thread synchronisation. A single-producer, single-consumer queue needs a defined ownership model and appropriate atomic operations or another synchronisation mechanism.

The writer also lacks a proper full-buffer check. Do not mistake the comment about overwrite behaviour for a complete overrun policy.

This is a systems boundary: deterministic emulated work meets an independently scheduled host consumer.

## Checkpoint

Before judging audio by ear, test one duty-table period, an envelope step, a sweep overflow, two wave-RAM nibbles, a repeatable noise sequence and the number of host samples emitted after a fixed tick count.

Then test queue underflow and overrun separately. A correct waveform and an unreliable queue are different failures, even when both sound like crackling.

## Continue the series

[Previous: Pixels arriving on time](/blog/game-boy-emulator-06-pipeline/). [Next: Making an emulator trustworthy](/blog/game-boy-emulator-08-verification/).

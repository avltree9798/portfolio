---
title: 'Game Boy emulator 7: audio'
date: '2026-11-20'
summary: 'Pulse, wave and noise channels, turning emulated ticks into audio samples, and the audio callback.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 7 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

Audio has to connect two kinds of time: millions of emulated ticks per second, and a sound card asking for a block of samples before a deadline. So this chapter is as much about generating and buffering samples as about sound.

## Checking samples before listening

A digital audio sample is a number giving the signal's value at one instant. Played back at a fixed rate, a stream of samples becomes sound.

The emulator's first job is to produce that stream from the device's state. You don't need speakers to check it: a list of sample values, or a quick plot, is easier to judge than "this sounds a bit off".

[`apu.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/apu.c) gets one `apu_tick()` call per emulated T-cycle. The front end opens a 48,000 Hz stereo SDL audio device.

## The four channels

| Channel | Generator         | Controls                                                    |
| ------- | ----------------- | ----------------------------------------------------------- |
| 1       | Pulse wave        | Duty pattern, period, envelope and frequency sweep          |
| 2       | Pulse wave        | Duty pattern, period and envelope                           |
| 3       | Programmable wave | A repeating list of 4-bit samples                           |
| 4       | Noise             | A shift register producing a repeating pseudo-random signal |

The duty pattern sets how much of each pulse cycle is high. The envelope changes the volume over time. The sweep changes the frequency over time.

Each channel is its own state machine with its own timing, so don't fold them all into a function that runs once per output sample.

## Which code actually runs

The top of `apu.c` says channel 3 is a stub, and an older helper returns zero for it. Further down, though, the `apu_tick()` code that actually runs steps through the wave position and reads samples from wave RAM, and register writes configure and trigger the channel.

So channel 3 isn't missing, but it isn't complete either:

- CPU writes to `0xFF30`–`0xFF3F` reach `apu_io_write()`, but it doesn't store them in wave RAM, so wave RAM keeps its reset values.
- The frame sequencer doesn't clock channel 3's length counter.
- Its length field is a byte, so it can't hold 256.

When reading unfamiliar code, start from the entry point that actually runs, follow what it calls, and only then compare with the comments. The older `mix_and_push_sample()` path isn't called from `apu_tick()`, so describing its helpers as the current design would give the wrong picture of the timing.

## Pulse channels

The pulse channels each pick one of four eight-step duty patterns. A timer decides when to move to the next step:

```text
ticks per duty step = (2048 - period_register) × 4
```

The full eight-step waveform repeats every eight of those. With a period register of 1024:

```text
step period = (2048 - 1024) × 4 = 4096 ticks
wave period = 8 × 4096 = 32,768 ticks
frequency = 4,194,304 / 32,768 = 128 Hz
```

That's calculated from gmboy's formula, not measured.

On each tick, the current step of the pattern outputs either zero or the envelope volume. That gives a recognisable pulse wave, without the finer analogue details of the hardware.

## The frame sequencer

gmboy runs an eight-step frame sequencer that advances every 8192 ticks, which is 512 steps per second.

Length counters update on steps 0, 2, 4 and 6 (256 times a second), channel 1's sweep on steps 2 and 6 (128 times a second), and envelopes on step 7 (64 times a second).

On hardware, the sequencer is driven by the timer's divider. [Pan Docs explains this and the analogue output stages](https://gbdev.io/pandocs/Audio_details.html). gmboy uses its own counter instead, so resetting the divider doesn't affect audio the way it does on hardware. The rates are right on average, but the link to the divider is missing.

## The wave channel

Channel 3 has 16 bytes of wave RAM holding 32 four-bit samples.

Teaching example:

```c
u8 packed = wave_ram[position / 2];
u8 sample = (position & 1) ? (packed & 0x0F) : (packed >> 4);
```

gmboy does this and then applies the output-level shift.

The `u8 length` field is a trap: assigning 256 to it gives zero. If zero and 256 need to mean different things, the field needs to be wider or the encoding defined carefully.

Channel 3 is also left out of the length updates. A good next test triggers the channel, advances the length clock and checks exactly when the channel turns off.

## The noise channel

Channel 4 uses a linear-feedback shift register (LFSR). gmboy XORs the two lowest bits, shifts the register and feeds the result back in near the top. A short mode feeds it back at a lower position too.

From a known starting state this always produces the same sequence. Using the host's random number generator would break the connection between the registers and the output.

The noise timer is a `u16`, but some divisor values need more bits after shifting, so large shifts can wrap. Test the period calculation on its own before blaming the audio device for an unexpected high-pitched sound.

## From ticks to samples

At 48,000 samples per second:

```text
emulated ticks per host sample = 4,194,304 / 48,000
                               ≈ 87.381333
```

That isn't a whole number, so always using 87 ticks would drift over time.

gmboy adds up the left and right values on every tick. When the counter reaches `cycles_per_sample`, it averages the totals, outputs one stereo sample, and subtracts the threshold rather than resetting to zero, so the fractional remainder carries over.

This is simple resampling. Averaging is better than taking one tick per sample, but it isn't a high-quality band-limited resampler, and it doesn't reproduce the hardware's analogue filtering.

## Mixing and the audio queue

`NR51` chooses which channels go to the left and right outputs, and `NR50` sets the master volume. gmboy adds up the selected channels, scales them and converts the result to signed 16-bit samples.

The CPU thread puts those left and right samples into a ring buffer, and SDL's callback takes them when the sound card needs more. If the buffer is empty, the callback outputs silence.

The buffer indices are `volatile`. That stops the compiler optimising some accesses away, but it doesn't make the queue thread-safe. A queue with one writer and one reader still needs atomic operations or a lock.

The writer also doesn't check properly for a full buffer. There's a comment about overwriting, but no real policy for what happens on overrun.

## Exercises

Before listening, test one duty-pattern period, one envelope step, a sweep overflow, two wave RAM samples, a repeatable noise sequence, and the number of samples produced after a fixed number of ticks.

Then test buffer underrun and overrun separately. A wrong waveform and an unreliable queue can both sound like crackling, but they're different bugs.

## Continue the series

[Previous: The pixel pipeline, sprites and DMA](/blog/game-boy-emulator-06-pipeline/). [Next: Input, tracing and testing](/blog/game-boy-emulator-08-verification/).

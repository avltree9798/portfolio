---
title: 'Game Boy emulator 3: executing instructions'
date: '2026-11-20'
summary: 'One instruction at a time: registers, decoding, operands, arithmetic flags, branches and the stack.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 3 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

An instruction is a few bytes asking the CPU to change some state. If you've written an interpreter, the structure will look familiar once you separate how an instruction is encoded from what it does.

gmboy splits the work into four parts: registers hold state, a table describes each opcode, operand fetching gets the inputs, and a handler does the operation.

## Registers

[The CPU context](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/include/cpu.h) holds the 8-bit registers `A`, `F`, `B`, `C`, `D`, `E`, `H` and `L`, and the 16-bit `PC` and `SP`.

The 8-bit registers can also be used in pairs: `AF`, `BC`, `DE` and `HL`. `A` is the accumulator that most arithmetic uses, `F` holds the flags, `HL` is often used as a memory address, and `SP` is the stack pointer.

Assigning a wider integer to a `uint8_t` keeps the value modulo 256, which models register wraparound for free. Flags, though, often need the wider result before it's truncated.

## Register pairs without host assumptions

[The register helpers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_util.c) read two adjacent byte fields through a 16-bit pointer and then swap the bytes.

That depends on the host's byte order, alignment and C's aliasing rules. Shifts and masks say the same thing directly.

Teaching example:

```c
u16 read_bc(const cpu_registers *regs) {
    return ((u16)regs->b << 8) | regs->c;
}

void write_bc(cpu_registers *regs, u16 value) {
    regs->b = (u8)(value >> 8);
    regs->c = (u8)value;
}
```

This version works the same on any host.

## The opcode table

An instruction's first byte is its opcode. In [the opcode table](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/instructions.c), `0x06` means "load the next byte into `B`".

Each entry records the operation type, addressing mode, register operands, an optional condition and an optional parameter. It describes the instruction; the handler implements it.

That lets several opcodes share one handler. Loading `A` from `B`, from the next byte or from memory differ only in where the value comes from.

Modern references call this CPU the SM83. It's similar to other 8-bit CPUs, but you can't just reuse a Z80 instruction table. [Pan Docs lists the encodings](https://gbdev.io/pandocs/CPU_Instruction_Set.html).

## Walking through `LD B, 0x42`

Suppose `PC` points at these bytes:

```text
address 0x0100: 0x06
address 0x0101: 0x42
```

[`cpu_step`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu.c) reads `0x06`, increments `PC` and counts one machine cycle for the fetch.

[Operand fetching](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_fetch.c) sees the "next byte" addressing mode, reads `0x42`, counts another cycle and moves `PC` to `0x0102`.

Then `proc_ld()` writes `0x42` into `B`.

| Property   | Before   | After              |
| ---------- | -------- | ------------------ |
| `PC`       | `0x0100` | `0x0102`           |
| `B`        | Anything | `0x42`             |
| Time taken | –        | Two machine cycles |

That table works as a test: it checks the resulting state and timing without caring which internal helper ran first.

## Memory destinations

For `LD (HL), A`, operand fetching records the value of `A`, the address in `HL`, and that the destination is memory. The load handler then calls `bus_write()`.

That's what the `fetched_data`, `mem_dest` and `dest_is_mem` fields are for: they carry the decoded operands to the handler.

`LD (HL+), A` also increments `HL`. Save the original address before incrementing, or the store lands one byte too late.

Keeping decoding, address calculation and the actual write in separate steps stops the instruction switch turning into one huge function that's hard to review.

## Arithmetic and flags

`ADD` produces a value and a set of flags that later instructions read.

The four flag bits are:

| Flag | Bit | Meaning                                      |
| ---- | --- | -------------------------------------------- |
| Z    | 7   | The result is zero                           |
| N    | 6   | The operation was a subtraction              |
| H    | 5   | A carry or borrow out of the lower four bits |
| C    | 4   | A carry or borrow out of the byte            |

Four bits is a nibble. For 8-bit addition, the half-carry flag H is set when the sum of the lower nibbles is more than 15.

Teaching example:

```c
u16 sum = (u16)a + b;
u8 result = (u8)sum;
bool zero = result == 0;
bool half_carry = ((a & 0x0F) + (b & 0x0F)) > 0x0F;
bool carry = sum > 0xFF;
```

`0x0F + 0x01` gives `0x10` with H set and C clear. `0xFF + 0x01` stores zero, with Z, H and C all set.

[The arithmetic handlers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_proc.c) do similar calculations. Some instructions leave certain flags unchanged, and the helper uses `-1` to mean "leave it". That relies on plain `char` being signed; an explicit signed type or a separate "keep" flag would be safer.

`ADC` also adds the carry flag. For subtract-with-carry, keeping `operand + carry` as a wider value makes it easier to follow. gmboy's `proc_sbc()` truncates that sum to a byte, so `0xFF + 1` wraps to zero before the subtraction, while the borrow flags use the original operand and carry. Modular arithmetic means the stored byte can still come out right, so test the result and flags together before calling it a bug. A wider intermediate just makes the code clearer.

## Branches

A conditional jump checks a flag, then either changes `PC` or carries on to the next instruction.

A relative jump adds a signed 8-bit offset to `PC` after the offset byte has been read. If `PC` is `0x0104` and the offset is `0xFC` (minus four), the jump goes to `0x0100`.

gmboy uses plain `char` for this. `int8_t` would make the signed conversion explicit and the same on every host.

Taken and untaken branches take different numbers of cycles, so tests should check both the destination and the cycle count.

## The stack

A call has to store its return address somewhere. [The stack helpers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/stack.c) decrement `SP` before each byte they push and increment it after each byte they pop.

Starting with `SP = 0xFFFE`, pushing `0x1234` writes:

```text
0xFFFD: 0x12
0xFFFC: 0x34
SP:     0xFFFC
```

Popping reads `0x34` then `0x12`, giving back `0x1234`.

Stack accesses go through the bus. If `SP` points at a device register, a push affects that device; there's no separate stack hidden in the C program.

## CB-prefixed instructions

The `0xCB` prefix byte introduces the bit, rotate and shift instructions. `proc_cb()` takes the target register from the lowest three bits of the next byte, the operation from the next three and the instruction group from the top two.

A bit-test instruction, for example, builds a mask from those fields and sets Z without changing the value it tests.

Instructions that target memory take longer. gmboy adds one fixed extra cost for every `(HL)` target. That should be checked for each instruction group; the register versions working doesn't prove it's right.

## Exercises

Write tests for: an immediate load, a store to memory, an addition that overflows, a subtraction with the carry set, a backward branch, and a call followed by a return.

For each one, set the starting registers and memory, and check the final registers, the changed memory and the cycles taken. That's the start of a CPU test harness, with no game or window needed.

## Continue the series

[Previous: Memory and the bus](/blog/game-boy-emulator-02-memory/). [Next: Timers and interrupts](/blog/game-boy-emulator-04-time/).

---
title: 'Game Boy emulator 3: teaching a CPU to execute'
date: '2026-11-20'
summary: 'Follow an instruction through registers, decoding, operand fetching, arithmetic flags, branches and the stack.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 3 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

A CPU instruction is a compact request to update machine state. Once you separate the request’s encoding from its meaning, the implementation starts to resemble an interpreter you might already have written.

We will follow that separation in `gmboy`: registers hold state, a table describes an opcode, operand fetching obtains its inputs, and a handler performs the operation.

## The state that survives an instruction

[The CPU context](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/include/cpu.h) contains the byte registers `A`, `F`, `B`, `C`, `D`, `E`, `H` and `L`, along with 16-bit `PC` and `SP` registers.

The byte registers can also be viewed in pairs: `AF`, `BC`, `DE` and `HL`. `A` is the accumulator used by many arithmetic operations. `F` holds flags. `HL` is frequently used as a memory address. `SP` is the stack pointer.

A byte is eight bits. Assigning a wider integer to a `uint8_t` keeps the value modulo 256. That is useful for modelling register wraparound, but flags often require the wider intermediate result before it is narrowed.

## Avoid making the host part of the CPU specification

[The register helpers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_util.c) currently reinterpret adjacent byte fields as a 16-bit pointer and reverse the result.

That couples the emulator to assumptions about byte order, alignment and C aliasing. We can express the intended value directly instead.

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

The casts and shifts now state the emulated relationship rather than relying on the host’s memory representation.

## Decode into a description

The first byte of an instruction is its opcode. In [the opcode table](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/instructions.c), `0x06` describes a load of an immediate byte into `B`.

The descriptor records an operation type, addressing mode, register operands, optional condition and optional parameter. It is data about the instruction, rather than the instruction’s implementation.

That lets multiple encodings share a handler. Loading `A` from `B`, loading `A` from an immediate byte and loading `A` from memory differ mainly in how they obtain the source value.

The processor is usually called the SM83 in modern technical references. It resembles related eight-bit processors, but it is not safe to substitute an arbitrary Z80 instruction table. [Pan Docs explains its encoding groups](https://gbdev.io/pandocs/CPU_Instruction_Set.html).

## Follow `LD B, 0x42`

Suppose `PC` points at these bytes:

```text
address 0x0100: 0x06
address 0x0101: 0x42
```

[The main CPU step](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu.c) fetches `0x06`, increments `PC` and accounts for the opcode-fetch machine cycle.

[Operand fetching](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_fetch.c) sees the immediate-byte addressing mode. It reads `0x42`, advances time again and moves `PC` to `0x0102`.

Finally, `proc_ld()` writes the fetched value into `B`.

The expected result is:

| Property               | Before                    | After              |
| ---------------------- | ------------------------- | ------------------ |
| `PC`                   | `0x0100`                  | `0x0102`           |
| `B`                    | Any byte                  | `0x42`             |
| Emulated time consumed | Zero for this instruction | Two machine cycles |

That table is already a useful test specification. It states visible state and timing, rather than which helper must be called first.

## Operand fetching can prepare a destination

For `LD (HL), A`, the operand-fetch stage records the value of `A`, the address held in `HL`, and the fact that the destination is memory.

The load handler then calls `bus_write()`.

This explains the context fields `fetched_data`, `mem_dest` and `dest_is_mem`. They are the interface between operand decoding and execution.

Instructions such as `LD (HL+), A` also update `HL`. Preserve the original destination before incrementing the register. Otherwise the store lands one byte later than intended.

Keeping that staging visible prevents a large instruction switch from mixing decoding, address calculation and device effects into one unreviewable operation.

## Arithmetic has more than one result

`ADD` produces a register value and flags that later instructions observe.

The four meaningful flag bits are:

| Flag | Bit | Meaning                                             |
| ---- | --- | --------------------------------------------------- |
| Z    | 7   | The result is zero                                  |
| N    | 6   | The operation was a subtraction                     |
| H    | 5   | A carry or borrow crossed the lower nibble boundary |
| C    | 4   | A carry or borrow crossed the byte boundary         |

A nibble is four bits. For eight-bit addition, half-carry asks whether the lower four-bit sum exceeded 15.

Teaching example:

```c
u16 sum = (u16)a + b;
u8 result = (u8)sum;
bool zero = result == 0;
bool half_carry = ((a & 0x0F) + (b & 0x0F)) > 0x0F;
bool carry = sum > 0xFF;
```

For `0x0F + 0x01`, the result is `0x10`, H is set and C is clear. For `0xFF + 0x01`, the stored result is zero, with Z, H and C set.

[The arithmetic handlers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/cpu_proc.c) express similar calculations. Some instructions preserve particular flags, and the helper uses `-1` to mean unchanged. An explicit signed parameter or a separate preserve mechanism would make that sentinel less dependent on plain `char` signedness.

`ADC` adds the incoming carry as well. For subtraction with carry, keeping the full `operand + carry` intermediate makes the calculation easier to inspect. The current `proc_sbc()` narrows that sum to a byte, so `0xFF + 1` wraps before subtraction, while its borrow calculations use the original operand and carry separately. The narrowed subtraction can still preserve the correct final byte through modular arithmetic. Test the result and flags together before calling the narrowing a bug; a wider intermediate simply makes the relationship more explicit.

## Branches observe the flags

A conditional jump checks flags, then either changes `PC` or continues at the next instruction.

Relative jumps add a signed eight-bit displacement to the program counter after the operand has been fetched. If that counter is `0x0104` and the displacement is `0xFC`, interpreting the displacement as negative four returns to `0x0100`.

The snapshot uses plain `char` for this conversion. A teaching implementation should use an explicit signed type such as `int8_t` so that the intended interpretation is visible on every supported host.

Taken and untaken branches can consume different amounts of time. A test should therefore check the destination and the tick count.

## The stack is memory with a convention

A call needs somewhere to retain the return address. [The stack helpers](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/stack.c) decrement `SP` before each pushed byte and increment it after each pop.

Starting with `SP = 0xFFFE`, pushing `0x1234` writes:

```text
0xFFFD: 0x12
0xFFFC: 0x34
SP:     0xFFFC
```

Popping reads `0x34`, then `0x12`, reconstructing `0x1234`.

Notice that this goes through the bus. If the stack points into a device region, a push can have device effects. The CPU does not receive a special private call stack from the host language.

## A second opcode byte

The `0xCB` prefix introduces bit, rotate and shift operations. `proc_cb()` extracts a target from the lower three bits, an operation field from the next three and a group from the upper two.

That is a small binary decoder. For example, a bit-test operation can compute a bit mask and update Z without changing the operand.

Memory targets still need distinct timing. The current handler charges a shared extra cost for `(HL)` targets, which should be checked against each instruction family rather than assumed correct because the register variants work.

## Checkpoint

Construct tests for an immediate load, a memory store, addition overflow, subtraction with an incoming carry, a backward branch, and a call followed by a return.

For each, specify initial registers, initial memory, final registers, changed memory and elapsed cycles. You now have the outline of a CPU test harness without needing a game or a window.

## Continue the series

[Previous: Memory is an interface](/blog/game-boy-emulator-02-memory/). [Next: Time, timers and interrupts](/blog/game-boy-emulator-04-time/).

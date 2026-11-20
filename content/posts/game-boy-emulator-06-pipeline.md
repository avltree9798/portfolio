---
title: 'Game Boy emulator 6: pixels arriving on time'
date: '2026-11-20'
summary: 'Build a pixel FIFO, select sprites, position a window and move sprite data through DMA.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 6 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

Now that we can decode tile data, we need to explain how the right pixel arrives at the right position and time.

The source uses a fetch state machine and a first-in, first-out queue. It also selects sprites, handles a window layer and models sprite-memory transfers. These features are a useful introduction to pipelines, backpressure and competing access to a resource.

## Separate fetching from consuming

A FIFO preserves the order in which values are inserted. The producer appends pixels; the consumer removes the oldest available pixel.

The queue decouples the cadence of tile fetching from the cadence of display output. Fetching one tile row gives us eight pixels, but the display consumes them one at a time.

[The pipeline source](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_pipeline.c) defines five fetch states:

```text
FS_TILE -> FS_DATA0 -> FS_DATA1 -> FS_IDLE -> FS_PUSH
```

They select a tile identifier, read the two row bytes, wait, and attempt to push decoded pixels. The fetch state machine advances on alternating PPU ticks. Pixel output is attempted on every tick.

If the queue is too full to accept another tile row, `FS_PUSH` remains active. That is backpressure: the producer waits because the downstream stage has not consumed enough work.

## Count different kinds of progress separately

The context tracks several horizontal positions because they answer different questions:

- `fetch_x`: where the next tile fetch is working.
- `line_x`: how many FIFO outputs have been consumed on this line.
- `pushed_x`: how many visible pixels have reached the framebuffer.
- `fifo_x`: the position used while preparing queued pixels.

These are not redundant copies of one counter. Fine scrolling can require consuming pixels that are not displayed, so consumed and visible positions differ.

For `SCX = 3`, the visible viewport begins three pixels into a background tile. The pipeline needs to account for that initial partial tile rather than jumping directly to the next eight-pixel boundary.

A useful debugging trace records all four counters together with queue depth. If a line finishes too early, we can ask whether the producer fetched too far, the consumer discarded too little, or the visible counter advanced incorrectly.

## The queue’s representation is an implementation choice

Each FIFO entry in this snapshot is individually allocated with `malloc()` and released with `free()`.

That is easy to explain as a linked queue, but it creates host allocation work for a tiny bounded pipeline. A fixed-capacity circular buffer would avoid those repeated allocations.

Teaching example:

```c
struct pixel_queue {
    u32 pixels[16];
    unsigned head;
    unsigned count;
};

unsigned insertion_index = (queue.head + queue.count) % 16;
```

This is a proposed representation, not a replacement already applied to `gmboy`. Capacity, empty handling and push/pop invariants would need tests.

The source rejects an empty pop by terminating the process. For development that makes a violated invariant obvious. A mature test harness should also tell us the scanline, tick and fetch state that led to it.

## Sprites begin with attributes, not pictures

Object Attribute Memory, or OAM, holds entries describing sprite position, tile identifier and attributes. The snapshot stores 40 entries and prepares up to ten candidates for a scanline.

The stored coordinates have offsets. The code compares a sprite’s vertical position against `LY + 16` and subtracts eight when deriving its horizontal position.

That is a reminder to distinguish a hardware register’s encoding from a screen coordinate. A raw OAM value is not necessarily the value you want in a host drawing API.

[The OAM search implementation](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_sm.c) scans the entries and creates an x-ordered linked list of selected candidates. Equal-x entries retain their existing order through the insertion logic.

There is an accuracy caveat: it skips entries with an x value of zero before counting the scanline limit. Hardware selection rules need more careful treatment, because an off-screen object can still affect the selection limit. The code is useful for learning the mechanism, not a complete model of OAM evaluation.

## Merge using indices before forgetting them

A sprite pixel with colour index zero is transparent. A background pixel with index zero can still be visibly mapped to a shade by its palette.

Those two facts make the original indices important. You cannot always make priority decisions using only the final 32-bit colour value.

`fetch_sprite_pixels()` checks candidate pixels, applies horizontal flipping, skips transparent sprite pixels and chooses whether the sprite can replace the background pixel. It uses the original background index for that priority decision.

Teaching decision sequence:

```text
no non-transparent sprite pixel -> keep background
sprite requests background priority and background index is non-zero
    -> keep background
otherwise -> use sprite palette and sprite index
```

For a vertically flipped sprite, the source reverses the row selection. For a 16-pixel-high sprite, it clears the tile identifier’s low bit so that the two-tile object starts at the correct pair boundary.

Build tests with overlapping objects, equal x coordinates, transparent pixels and differing palettes. A single visible sprite exercises very little priority logic.

## The window is a separately positioned tile layer

The window is not an operating-system window. It is a second tile-map view used for elements such as status areas.

The code keeps a `window_line` counter because the window’s row progression is not necessarily the same as the background’s scrolled row. It also considers the hardware’s horizontal positioning offset when selecting a window tile.

The current implementation mixes `XRES` and `YRES` in parts of its window bounds checks and computes the shared tile row from background scroll state. Those are concrete areas to investigate with a window whose start position changes between lines.

A good test image places recognisable patterns in both maps, enables the window partway down the screen and then varies its horizontal position. That separates map selection, pixel-row selection and visibility.

## DMA is work that continues after the write

A write to `0xFF46` supplies the high byte of the source address. [The DMA engine](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/dma.c) starts a transfer with a two-step delay, then copies one byte on each DMA step.

For a start value of `0xC0`:

```text
source:      0xC000 through 0xC09F
destination: 0xFE00 through 0xFE9F
bytes:       0xA0 = 160
```

The scheduler steps DMA once per machine cycle. Notice that the destination write goes directly to the PPU’s OAM helper. A CPU bus write to the same region would be rejected while DMA is active, so using the CPU-facing path for the DMA engine’s own write would block the transfer itself.

That is the resource-access distinction from part 2 made concrete.

[The hardware DMA description](https://gbdev.io/pandocs/OAM_DMA_Transfer.html) also specifies CPU bus restrictions. This snapshot blocks CPU OAM accesses during transfer but does not model all DMG restrictions on the rest of the address space. Its two-cycle startup is part of its current model and should be validated separately from the 160-byte transfer count.

## Checkpoint

Trace one tile row through the fetch states and FIFO. Then repeat with three initial pixels discarded for scrolling. Finally, start DMA and record which source byte reaches which OAM offset after every machine cycle.

The central lesson is that state has an owner, access has a requester, and time determines when an effect becomes visible. That pattern extends well beyond emulation.

## Continue the series

[Previous: From bytes to a picture](/blog/game-boy-emulator-05-pixels/). [Next: Making the machine audible](/blog/game-boy-emulator-07-audio/).

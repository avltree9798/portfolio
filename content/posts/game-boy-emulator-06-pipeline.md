---
title: 'Game Boy emulator 6: the pixel pipeline, sprites and DMA'
date: '2026-11-20'
summary: 'The pixel FIFO, sprite selection and priority, the window layer and OAM DMA.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 6 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

Part 5 decoded tile data. This part covers how each pixel gets to the right place at the right time.

gmboy uses a fetch state machine feeding a first-in, first-out queue (FIFO). It also picks sprites, draws the window layer and copies sprite data with DMA. Along the way you'll meet pipelines, backpressure and two devices competing for the same memory.

## The fetcher and the FIFO

A FIFO hands values out in the order they went in. The fetcher adds pixels at one end, and the display takes the oldest pixel from the other.

The queue lets the two run at different rates: fetching one tile row produces eight pixels at once, but the display takes them one at a time.

[`ppu_pipeline.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_pipeline.c) has five fetch states:

```text
FS_TILE -> FS_DATA0 -> FS_DATA1 -> FS_IDLE -> FS_PUSH
```

They read the tile number, read the two row bytes, wait, and then try to add the decoded pixels to the queue. The fetcher moves on every other PPU tick; the display tries to take a pixel every tick.

If the queue is too full for another row, the fetcher stays in `FS_PUSH` until there's room. That's backpressure: the producer waits for the consumer to catch up.

## Four horizontal counters

The context tracks four horizontal positions, each answering a different question:

- `fetch_x`: where the next tile fetch is.
- `line_x`: how many pixels have been taken from the FIFO on this line.
- `pushed_x`: how many visible pixels have reached the framebuffer.
- `fifo_x`: the position used while preparing pixels for the queue.

They aren't copies of one counter. With fine scrolling, some pixels are taken from the queue and thrown away, so pixels consumed and pixels shown differ.

With `SCX = 3`, the screen starts three pixels into a background tile. The pipeline has to handle that partial first tile rather than skipping to the next tile boundary.

When debugging, log all four counters and the queue length together. If a line ends too early, you can then tell whether the fetcher went too far, too few pixels were discarded, or the visible counter moved wrongly.

## How the queue is stored

gmboy allocates each FIFO entry with `malloc()` and frees it with `free()`.

That's easy to explain as a linked list, but it means a lot of allocation for a queue that never holds many pixels. A fixed-size circular buffer avoids it.

Teaching example:

```c
struct pixel_queue {
    u32 pixels[16];
    unsigned head;
    unsigned count;
};

unsigned insertion_index = (queue.head + queue.count) % 16;
```

This is a suggestion, not something gmboy does. It would need tests for capacity, empty pops and push/pop behaviour.

gmboy exits the program if it tries to pop from an empty queue. That makes the bug obvious during development, but a proper test harness should also report the line, tick and fetch state that led to it.

## Selecting sprites

Object Attribute Memory (OAM) holds each sprite's position, tile number and attributes. gmboy stores 40 entries and picks up to ten for each line.

The stored coordinates are offset: the code compares a sprite's vertical position with `LY + 16` and subtracts 8 from its horizontal position. The raw OAM value isn't a screen coordinate.

[The OAM search](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_sm.c) goes through the entries and builds a linked list of selected sprites sorted by x. Sprites with the same x keep their original order.

It skips sprites with x equal to zero before counting towards the ten-sprite limit. On hardware, off-screen sprites still count towards that limit, so this is a simplification.

## Sprite priority

A sprite pixel with colour index 0 is transparent. A background pixel with index 0 is still drawn, in whatever shade the palette gives it.

So priority has to be decided using the colour indices, not the final colours.

`fetch_sprite_pixels()` goes through the candidate pixels, applies horizontal flipping, skips transparent sprite pixels and decides whether the sprite should cover the background, using the background pixel's original index.

The rule:

```text
no non-transparent sprite pixel -> keep background
sprite asks to stay behind the background and background index is non-zero
    -> keep background
otherwise -> use sprite palette and sprite index
```

For vertically flipped sprites, gmboy reads the rows in reverse. For 16-pixel-tall sprites, it clears the low bit of the tile number so the two tiles start on an even pair.

Test with overlapping sprites, sprites at the same x, transparent pixels and different palettes. One sprite on its own barely tests the priority logic.

## The window layer

The window has nothing to do with operating-system windows. It's a second tile map that can be placed over the background, typically for status bars.

gmboy keeps a separate `window_line` counter, because the window's current row doesn't follow the background's scrolled row. It also applies the hardware's horizontal offset when choosing window tiles.

Some of the window bounds checks mix up `XRES` and `YRES`, and the shared tile row is calculated from the background's scroll values. Both are worth checking with a window whose position changes between lines.

For a test, put recognisable patterns in both maps, turn the window on partway down the screen and move it horizontally. That checks map selection, row selection and visibility separately.

## OAM DMA

Writing to `0xFF46` gives the high byte of a source address. [`dma.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/dma.c) starts the transfer after a two-step delay, then copies one byte per DMA step.

Writing `0xC0`:

```text
source:      0xC000 through 0xC09F
destination: 0xFE00 through 0xFE9F
bytes:       0xA0 = 160
```

The scheduler steps DMA once per machine cycle. DMA writes to OAM directly through a PPU helper, not through the CPU's bus path. That's necessary: the bus rejects CPU writes to OAM while DMA is running, so going through it would block DMA's own transfer. This is the point from part 2 about different devices needing different access.

[On hardware](https://gbdev.io/pandocs/OAM_DMA_Transfer.html), the CPU is also restricted from other memory during DMA. gmboy blocks CPU access to OAM but not all the other DMG restrictions. The two-cycle start-up delay is gmboy's own model and should be tested separately from the 160-byte count.

## Exercises

Trace one tile row through the fetch states and the FIFO. Repeat with three pixels discarded for scrolling. Then start a DMA and record which source byte has been copied to which OAM address after each machine cycle.

## Continue the series

[Previous: Tiles, palettes and the display](/blog/game-boy-emulator-05-pixels/). [Next: Audio](/blog/game-boy-emulator-07-audio/).

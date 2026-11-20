---
title: 'Game Boy emulator 5: from bytes to a picture'
date: '2026-11-20'
summary: 'Decode tile graphics, map a scrolling background and follow the LCD through a complete frame.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 5 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers starting to explore computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code labelled as a teaching example explains an idea; it is not a claim that the repository already contains that implementation.

A framebuffer is a rectangular array of final pixels. It is tempting to imagine that a Game Boy game fills one such array and hands it to a display library.

The original machine works at a different level. Its graphics data is organised into small tiles, maps, palettes and sprite attributes. The PPU combines those inputs while moving across the display.

We will start with the data representation, then attach it to the display’s timing.

## A pixel can be an index rather than a colour

The visible monochrome display is 160 pixels wide and 144 pixels high. Its tile graphics use four colour indices, so each source pixel needs two bits.

A tile is eight pixels by eight pixels. Its storage cost is:

```text
8 × 8 pixels × 2 bits = 128 bits = 16 bytes
```

Those bytes are arranged as two bytes per row. The first byte supplies the lower bit of each pixel’s index; the second supplies the upper bit. Bit 7 describes the leftmost pixel.

Teaching example:

```c
u8 decode_pixel(u8 low_plane, u8 high_plane, unsigned x) {
    unsigned bit = 7 - x;
    u8 low = (low_plane >> bit) & 1;
    u8 high = (high_plane >> bit) & 1;
    return low | (high << 1);
}
```

The function returns an index from zero to three, not an SDL colour value.

## Work through one row

Use these deliberately small inputs:

```text
low plane:  01010101
high plane: 00110011
indices:    0 1 2 3 0 1 2 3
```

For the first pixel, both plane bits are zero. For the second, the lower bit is one and the upper bit is zero. For the third, the lower bit is zero and the upper bit is one.

This example distinguishes the bit planes. A row of all zeroes cannot reveal a swapped-plane bug because both incorrect and correct implementations produce the same result.

[The tile-data reference](https://gbdev.io/pandocs/Tile_Data.html) describes the hardware representation. In `gmboy`, the active graphics path combines the two bytes in `pipeline_fifo_add()`.

## A palette maps indices to display values

A palette register packs four two-bit entries into one byte. To obtain the shade selected for an index:

```c
u8 shade = (palette >> (2 * index)) & 0x03;
```

That shade can then select a 32-bit output colour.

[The LCD module](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/lcd.c) stores background and sprite colour arrays. A register write updates those arrays so that the pixel path can use them directly.

There is a useful boundary mistake here. The first entry uses `palette_data & 0x11`, whereas a two-bit field requires `0x03`. The former mask can produce values outside a four-entry array. It should not be copied into a teaching implementation.

For tests, try palette bytes with different values in every field. Verify the index extraction before testing a whole image.

## A map chooses which tile to draw

The background map is a grid of tile identifiers. Each map row contains 32 entries. The display observes a smaller viewport within the resulting background.

For a teaching background fetch:

```text
world_x = (screen_x + scroll_x) modulo 256
world_y = (screen_y + scroll_y) modulo 256
map_column = world_x / 8
map_row = world_y / 8
map_offset = map_row × 32 + map_column
pixel_row_in_tile = world_y modulo 8
```

The source stores several of these values in byte fields. Assigning the sums into those fields supplies the wraparound implicitly.

A straightforward implementation can express the wrap explicitly while explaining the idea, then decide whether narrowing is a sufficiently clear representation in production code.

## Tile identifiers have two addressing interpretations

LCDC selects either an unsigned tile-data mode or a signed mode for the background and window.

In a teaching implementation, the signed mode is particularly clear when written relative to `0x9000`:

```c
u16 tile_address = 0x9000 + (int8_t)tile_id * 16;
```

The unsigned mode uses `0x8000 + tile_id * 16`.

The repository expresses the signed interpretation differently. Its base becomes `0x8800`, and it adds 128 to the eight-bit tile identifier before multiplying. The byte wraparound is part of that translation.

For example, identifier zero becomes 128, producing `0x8800 + 128 × 16 = 0x9000`. Identifier `0xFF` becomes 127 after byte wraparound, selecting `0x8FF0`, which corresponds to signed negative one.

Being able to prove that equivalence is more valuable than memorising either expression.

## The display is a state machine

The PPU does not render the entire image in one call. [Its state machine](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_sm.c) moves through these modes:

| Mode             | Responsibility                                           |
| ---------------- | -------------------------------------------------------- |
| OAM search       | Select sprite candidates for the current scanline        |
| Pixel transfer   | Fetch and combine pixels                                 |
| Horizontal blank | Finish the remainder of the scanline                     |
| Vertical blank   | Complete the non-visible scanlines before the next frame |

The source uses 456 ticks per scanline and 154 scanlines per frame. The first 144 lines are visible. It changes from OAM search after 80 ticks, then leaves pixel transfer when 160 pixels have been pushed.

That last condition matters. Pixel transfer is associated with work completed by the pipeline, rather than being a single call that paints the whole frame.

The hardware timing overview is described in [Pan Docs’ rendering chapter](https://gbdev.io/pandocs/Rendering.html). The snapshot does not implement every access restriction or display-disable transition described there.

## Derive the frame duration

The source constants give us:

```text
456 ticks per line × 154 lines = 70,224 ticks per frame
70,224 / 4,194,304 seconds ≈ 0.016743 seconds
frames per second ≈ 59.73
```

These are calculated values, not a benchmark result from running this emulator.

The host pacing code targets an integer `1000 / 60` milliseconds. That is a separate approximation and does not preserve the fractional duration above. It is possible to have internally consistent display transitions while presenting them at a slightly incorrect wall-clock rate.

We will return to pacing when discussing the audio queue and host front end.

## Pixels eventually need somewhere to go

[The PPU context](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/include/ppu.h) owns a `video_buffer` of 32-bit pixels. The active pipeline writes each completed pixel at:

```text
buffer index = visible_x + scanline × 160
```

This is the natural seam between emulated display logic and host rendering. SDL should present that buffer; it should not decide how a Game Boy tile is addressed.

The allocation in the snapshot uses `sizeof(32)`. On a typical host that happens to be the expected size, but `sizeof(*ctx.video_buffer)` states the actual allocation contract. It also remains correct if the buffer’s element type changes.

## Checkpoint

Before introducing sprites, verify:

1. One row with indices `0 1 2 3 0 1 2 3`.
2. A tile whose top and bottom rows differ.
3. A map containing distinct neighbouring tile identifiers.
4. A scroll value that crosses a tile boundary.
5. Signed tile identifiers zero, `0x7F`, `0x80` and `0xFF`.
6. A full frame’s line and tick counts.

This ordering separates representation errors from scheduling errors. A bad picture should lead to a smaller question than “is the PPU broken?”

## Continue the series

[Previous: Time, timers and interrupts](/blog/game-boy-emulator-04-time/). [Next: Pixels arriving on time](/blog/game-boy-emulator-06-pipeline/).

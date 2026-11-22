---
title: 'Game Boy emulator 5: tiles, palettes and the display'
date: '2026-11-20'
summary: 'Decoding tile graphics, scrolling the background map and stepping the LCD through a frame.'
tags: ['systems engineering', 'Game Boy', 'C']
draft: false
---

Part 5 of [Building a Game Boy emulator in C](/blog/building-a-game-boy-emulator/). Written for software engineers who are new to computer systems.

This chapter follows [`gmboy` at `c1267fd`](https://github.com/avltree9798/gmboy/tree/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab). Code marked as a teaching example illustrates an idea and isn't necessarily in the repository.

A framebuffer is a rectangle of finished pixels, and it's tempting to assume a Game Boy game fills one and hands it to the screen.

It doesn't. Graphics are stored as small tiles, tile maps, palettes and sprite attributes, and the PPU combines them while it moves across the display. This chapter covers how that data is stored, then how the display steps through a frame.

## Pixels are palette indices

The screen is 160 by 144 pixels. Tiles use four colour indices, so each pixel takes two bits.

A tile is 8 by 8 pixels:

```text
8 × 8 pixels × 2 bits = 128 bits = 16 bytes
```

Each row is two bytes. The first holds the low bit of each pixel's index and the second holds the high bit. Bit 7 is the leftmost pixel.

Teaching example:

```c
u8 decode_pixel(u8 low_plane, u8 high_plane, unsigned x) {
    unsigned bit = 7 - x;
    u8 low = (low_plane >> bit) & 1;
    u8 high = (high_plane >> bit) & 1;
    return low | (high << 1);
}
```

This returns an index from 0 to 3, not a screen colour.

## Decoding one row

```text
low plane:  01010101
high plane: 00110011
indices:    0 1 2 3 0 1 2 3
```

The first pixel has both bits clear. The second has only the low bit set, and the third only the high bit.

Test with a row like this one, where the two bytes differ. A row of zeros gives the same result even if you mix up the low and high bytes.

[Pan Docs describes the tile format](https://gbdev.io/pandocs/Tile_Data.html). In gmboy, `pipeline_fifo_add()` combines the two bytes.

## Palettes

A palette register packs four 2-bit entries into one byte. To get the shade for an index:

```c
u8 shade = (palette >> (2 * index)) & 0x03;
```

The shade then picks a 32-bit output colour.

[`lcd.c`](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/lcd.c) keeps arrays of background and sprite colours, and updates them whenever a palette register is written, so drawing can use them directly.

There's a bug in it: the first entry uses `palette_data & 0x11` instead of `& 0x03`. `0x11` can produce values past the end of a four-entry array. Don't copy it.

Test with a palette byte that has a different value in every field, and check the extraction before testing whole images.

## The background map

The background map is a grid of tile numbers, 32 per row. The screen shows a window onto part of it.

A teaching version of the background fetch:

```text
world_x = (screen_x + scroll_x) modulo 256
world_y = (screen_y + scroll_y) modulo 256
map_column = world_x / 8
map_row = world_y / 8
map_offset = map_row × 32 + map_column
pixel_row_in_tile = world_y modulo 8
```

gmboy stores several of these in byte-sized fields, so the modulo 256 happens automatically when the sum is assigned. Writing the wrap out explicitly is clearer while you're learning; whether to rely on byte truncation in real code is a style choice.

## Signed and unsigned tile numbers

A bit in the LCDC register chooses whether background and window tile numbers are unsigned or signed.

The signed mode is easiest to read relative to `0x9000`:

```c
u16 tile_address = 0x9000 + (int8_t)tile_id * 16;
```

Unsigned mode uses `0x8000 + tile_id * 16`.

gmboy does the signed case differently: it uses a base of `0x8800`, adds 128 to the tile number and lets it wrap as a byte, then multiplies.

Tile number 0 becomes 128, giving `0x8800 + 128 × 16 = 0x9000`. Tile number `0xFF` wraps to 127, giving `0x8FF0`, which is the same as signed minus one. Both versions give the same addresses; working through a few values like this shows why.

## The display modes

The PPU doesn't draw the whole image in one call. [Its state machine](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/lib/ppu_sm.c) steps through these modes:

| Mode             | What happens                                |
| ---------------- | ------------------------------------------- |
| OAM search       | Picks the sprites on the current line       |
| Pixel transfer   | Fetches and combines pixels                 |
| Horizontal blank | Waits out the rest of the line              |
| Vertical blank   | Runs the hidden lines before the next frame |

gmboy uses 456 ticks per line and 154 lines per frame, of which the first 144 are visible. OAM search ends after 80 ticks, and pixel transfer ends once 160 pixels have been output.

So pixel transfer lasts as long as the pipeline takes to produce the line, rather than being one call that draws everything.

[Pan Docs' rendering section](https://gbdev.io/pandocs/Rendering.html) has the hardware timing. gmboy doesn't implement all the memory-access restrictions or the display-off behaviour described there.

## Frame rate

From gmboy's constants:

```text
456 ticks per line × 154 lines = 70,224 ticks per frame
70,224 / 4,194,304 seconds ≈ 0.016743 seconds
frames per second ≈ 59.73
```

That's calculated from the constants, not measured.

The front end waits a whole number of milliseconds per frame (`1000 / 60`), which doesn't match 59.73 frames per second exactly. The display can step through its modes correctly and still be shown at a slightly wrong real-world speed. Part 7 comes back to this with audio.

## The output buffer

[The PPU context](https://github.com/avltree9798/gmboy/blob/c1267fd0a3d73294f4f8f5ee2b16b254b78969ab/src/include/ppu.h) owns `video_buffer`, an array of 32-bit pixels. Each finished pixel is written to:

```text
buffer index = visible_x + scanline × 160
```

This buffer is where the emulated display hands over to the host. SDL should just show it; it shouldn't know anything about how tiles are addressed.

gmboy allocates it with `sizeof(32)`. That happens to be the right size on most hosts, but `sizeof(*ctx.video_buffer)` says what's actually meant and stays correct if the pixel type changes.

## Exercises

Before adding sprites, test:

1. One row with indices `0 1 2 3 0 1 2 3`.
2. A tile whose top and bottom rows differ.
3. A map with different tile numbers next to each other.
4. A scroll value that crosses a tile boundary.
5. Signed tile numbers 0, `0x7F`, `0x80` and `0xFF`.
6. The line and tick counts for a full frame.

Doing them in this order separates data-format bugs from timing bugs, so a wrong picture leads to a specific question rather than "the PPU is broken".

## Continue the series

[Previous: Timers and interrupts](/blog/game-boy-emulator-04-time/). [Next: The pixel pipeline, sprites and DMA](/blog/game-boy-emulator-06-pipeline/).

---
title: 'Airtrace engineering 5: learning where receivers can hear'
date: '2026-11-23'
summary: 'A receiver coverage map learned from every position heard: hexagons on the map’s own projection, fading scores, batched writes, a background sweep paid for from a rationed API, and predicting when a quiet flight will be heard again.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 5 of [Airtrace engineering](/blog/airtrace-engineering/).

[Part 1](/blog/airtrace-engineering-01-estimates/) estimated where a flight is once nobody can hear it. The natural next question is: when will someone hear it again? To answer that you need a map of where receivers are, and nobody publishes one. ADS-B coverage comes from thousands of volunteers' antennas, switched on and off as people move house or unplug a Raspberry Pi.

But every position Airtrace receives is proof that some receiver can hear that spot at that altitude. Collect enough of them and the coverage map draws itself.

## Hexagons on the map’s projection

The positions go into bins. I used hexagons rather than squares, for the usual reasons: all six neighbours of a hexagon are the same distance away (a square's diagonal neighbours are 41% further than its side neighbours), and a map of hexagons doesn't show the blocky artefacts of a grid.

The less usual decision was which surface to tile. Hexagons that are equal in area on the globe look stretched and distorted on a web map, because the map uses the Web Mercator projection, which enlarges everything towards the poles. Since the only point of the grid is to be looked at on that map, I tile the projected map instead. Longitude stays as it is; latitude becomes its Mercator equivalent:

```ts
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2)) / rad
```

and the hexagons are regular in that space, with a radius of 0.2 projected degrees: about 45 km across at the equator and 28 km at London. They look identical on screen at every latitude and shrink on the ground towards the poles, exactly as the map itself does.

Finding a point's cell uses axial coordinates, the standard way to address a hex grid with two integers. Converting a position gives fractional coordinates, and rounding them naively sometimes picks the wrong hexagon near the corners. The fix is to round in **cube coordinates** (three numbers that always sum to zero) and then repair whichever one was rounded furthest:

```ts
const sf = -qf - rf
let q = Math.round(qf),
  r = Math.round(rf)
const s = Math.round(sf)
const [dq, dr, ds] = [Math.abs(q - qf), Math.abs(r - rf), Math.abs(s - sf)]
if (dq > dr && dq > ds) q = -r - s
else if (dr > ds) r = -q - s
```

A test checks that points all over the world fall inside the cell they're assigned to, so there are no gaps or overlaps.

## Two bands and a fading score

Receivers hear high aircraft much further away than low ones, because the curve of the Earth hides low aircraft beyond the horizon. So each cell has two layers: below 10,000 ft (including aircraft on the ground) and above.

Coverage changes, so old evidence should count for less. Each cell stores a score and when it was last updated. The score halves every three days, and each snapshot that hears something in the cell adds one (one, not one per aircraft: a busy cell isn't better covered than a quiet one, just busier). Cells that fade to nothing are deleted, so storage doesn't grow forever.

## Writing it down cheaply

All of Airtrace's live data passes through one Durable Object (the one from [the first article](/blog/building-airtrace/) that shares the API allowance), so that's where sightings are collected. Writing to storage on every snapshot, every two seconds, would be wasteful. Sightings are batched in memory and written once a minute, grouped into 10° tiles: one storage read and write per tile that changed. If the object is evicted before a flush, at most a minute of sightings is lost, which a map that fades over days doesn't notice.

Tiles near the poles can hold a couple of thousand cells, because Mercator hexagons are small there. Stored naively, with millisecond timestamps and full-precision scores, that gets bulky, so tiles store times in whole minutes and scores to two decimals.

## Looking where nobody is looking

There's a bias. Airtrace only fetches regions that someone is viewing or following, so the map would only learn about busy places. To fill in the rest, the five-minute background job samples three more regions each run, in rotation through about 800 regions covering the world from 56°S to 72°N. A full sweep takes about a day.

That costs about 26,000 requests a month from a monthly allowance of 290,000, and it uses only the primary provider: the backups have small daily limits that real visitors need. The sweep shares the same "one request every two seconds" slot as everyone else, which turned up a real bug: live map requests that found the slot taken were treated as a provider failure and sent down the backup chain, which made the map show "Live data is unavailable" whenever two requests collided. Live requests now serve a snapshot under ten seconds old, or wait for the next slot.

![The map over western Europe with the coverage layer on: faint blue hexagons under the traffic between England, the Low Countries and Germany](/images/airtrace/engineering/coverage.webp)

_The coverage layer about an hour after it started learning. Brighter hexagons have been heard more often; it fills in over the following days._

## When will it be heard again?

With a coverage map, the estimate from part 1 can answer the question. Run it forward up to three hours, take its path in five-minute steps, and find the first point that lands in a cell receivers hear regularly: a score of at least 2 (heard more than once) in the right altitude band, last heard within a week.

```ts
const ahead = estimatePosition({ points, now: until, destination })
const future = timedPath(ahead.path, lastHeardAt, until).filter(
  (p) => p.at >= now,
)
const back = predictReentry(future, coverageLookup(cells, Date.now()))
```

The map then marks that spot: "Back in coverage around 02:40 UTC near Almaty."

## What it can't do

An empty cell is ambiguous: no receiver hears it, or nothing has flown through it while Airtrace was looking. The sweep reduces that over time but can't remove it, so empty cells are drawn as empty rather than as "no coverage". The prediction is only as good as the estimate underneath it, and it needs a few days of learning before it says much outside busy regions. And it describes FlyItalyADSB's network of receivers, not ADS-B coverage in general: other networks hear other places.

## Continue the series

[Previous: Spotting holds and go-arounds](/blog/airtrace-engineering-04-manoeuvres/) [Next: Sunlight at altitude, and contrails](/blog/airtrace-engineering-06-sky/).

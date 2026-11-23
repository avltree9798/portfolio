---
title: 'Airtrace engineering 7: how far off the direct route?'
date: '2026-11-23'
summary: 'Measuring how much further a flight is flying than the direct great circle, and how far and which way it strays, with cross-track distance, partial tracks, and a deliberate refusal to guess why.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 7 of [Airtrace engineering](/blog/airtrace-engineering/).

Look at a long-haul flight's track and it rarely matches the arc a map app would draw between its airports. North Atlantic flights follow tracks laid out each day around the jet stream; flights between Europe and Asia route around closed airspace; everything bends around weather and military areas. This last part measures that difference: how much further than the direct route a flight is flying, and how far off it strays.

## The direct route is a great circle

On a sphere, the shortest path between two points is a great circle, and on a Mercator map it bows towards the pole. From Paris to Hong Kong it heads north-east over Germany and Poland and crosses Russia. That's the line to measure against.

## Extra distance

The extra distance is what the aircraft has flown, plus the direct distance it still has to go, minus the direct distance from where it started:

```ts
let flown = partial ? 0 : nm(origin, first)
for (let i = 1; i < points.length; i++) flown += nm(points[i - 1], points[i])
const extraNm = flown + nm(current, destination) - directNm
```

Measuring it this way works partway through a flight, before the remaining distance is known, and it's zero for an aircraft exactly on the great circle.

"Where it started" needs care. Airtrace gets recorded tracks a UTC day at a time, and coverage has gaps, so a track often starts in mid-air. If the first report is more than 50 nm from the origin airport, the measurement starts from that first report instead and is labelled as partial ("since it was first tracked today").

## Cross-track distance

How far off the route is an aircraft? The **cross-track distance** is its distance from the great circle, measured at right angles to it. With δ₁₃ the angular distance from the start to the aircraft, θ₁₃ the bearing from the start to the aircraft, and θ₁₂ the bearing from the start to the destination:

```ts
const d13 = nm(start, p) / R_NM
const relative = (bearingTo(start, p) - bearingTo(start, end)) * rad
return Math.asin(Math.sin(d13) * Math.sin(relative)) * R_NM
```

It's signed: positive to the right of the direction of travel, negative to the left. The largest one along the track says how far the flight strayed; its sign, turned into a compass direction for the reader, says which way. "Right of the route" for a flight heading east is south.

## What real flights look like

Run over the recorded flights:

- **AFR188**, Paris to Hong Kong: 140 nm extra so far (2.7%), up to 340 nm south of the direct route.
- **GFA090**, New York to Bahrain: 79 nm extra (1.4%), up to 486 nm south.
- **DAL85**, Paris to Atlanta: 80 nm extra (2.1%), up to 144 nm north.
- **AAL50**, Dallas to Heathrow: 43 nm extra (1.0%), up to 218 nm east.
- **VIR104L**, Atlanta to Heathrow: 34 nm extra (0.9%), up to 39 nm south.
- **DAL37**, Heathrow to Atlanta: 25 nm extra (0.7%), up to 72 nm north.

Percentages are of the direct distance from where the track starts.

![The first 500 nm of AFR188 from Paris: the direct great circle to Hong Kong heads north-east, while the recorded track heads south-east to Austria](/images/airtrace/engineering/detour-afr188.svg)

AFR188 is the interesting one. Its recorded track for the day covers only the first 500 nm, from Paris to over Austria in about an hour, and in that hour it's already 340 nm south of the direct route. The great circle to Hong Kong heads north-east, over Russia; the flight heads south-east.

The other thing the table shows is how little distance a large sideways offset costs. Being 340 nm off the line has added only 140 nm so far. Geometry explains it: if you fly a dogleg that reaches a distance _d_ to the side of a straight route of length _L_, the extra distance is roughly 2*d*²/_L_ for small _d_: it grows with the square of the offset, and long routes absorb it easily. That's why airlines can route hundreds of miles around a closed area at a cost of a few percent.

## Not guessing why

It would be easy to add a line saying "routing south of Russian airspace". I deliberately didn't. The reason for any particular detour (a closure, the day's oceanic tracks, weather, a military exercise, a request from air traffic control) isn't in the data, and the list of closed airspace changes and is political. Airtrace describes the geometry ("up to 340 nm south of the direct line") and lets you draw the conclusion.

The aircraft card shows it only when it's worth saying: more than 30 nm extra or more than 50 nm off the line. Most short flights never trigger it.

## The end of the series

That's the seven. Each started from a question the raw data doesn't answer, and each got better the moment it met real flights: the steering that made estimates worse, the comparison flattered by smoothed data, the departures that looked like go-arounds, the observer threshold that never overlapped the plane's. If there's one habit worth taking from the series, it's to measure against reality, write the numbers down, and let the tests hold you to them.

[Previous: Sunlight at altitude, and contrails](/blog/airtrace-engineering-06-sky/) [Back to the series](/blog/airtrace-engineering/).

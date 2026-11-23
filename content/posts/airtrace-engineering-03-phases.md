---
title: 'Airtrace engineering 3: flight phases with a hidden Markov model'
date: '2026-11-23'
summary: 'Telling climb, cruise, descent and approach apart without flickering: emission scores, transition costs, Viterbi decoding, a split hidden state, and a comparison that only looked good because of smoothed data.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 3 of [Airtrace engineering](/blog/airtrace-engineering/).

What is this aircraft doing: taxiing, climbing, cruising, descending, on approach? It sounds like an `if` statement:

```ts
if (p.ground) return 'ground'
if (rate > 300) return 'climb'
if (rate < -300) return altitude < 10000 ? 'approach' : 'descent'
return altitude >= 18000 ? 'cruise' : 'level'
```

where `rate` is the vertical rate in feet per minute. That's roughly how Airtrace's first version worked, and it flickers. Turbulence pushes the reported vertical rate past ±300 for a report or two, an aircraft levelling off at 10,000 ft hovers around the threshold, and the phase strip on the aircraft card turns into a barcode.

Smoothing the input helps a bit. The real fix is to stop deciding each point on its own.

## Phases as hidden states

A **hidden Markov model** says: the aircraft is in some phase we can't see directly, and each report is evidence about it. Two kinds of number describe the model.

**Emission scores**: how well does this report fit each phase? Climb expects a vertical rate around +1,600 ft/min; descent around −1,700 and above 8,000 ft; cruise about level and above FL180 (18,000 ft); approach a gentle descent with level stretches, low down. I score each as a log-likelihood, using Gaussian bells with soft penalties for the wrong altitude:

```ts
case 'climb':
  return gauss(v, 1600, 900) + below(v, 4500, 800)
case 'cruise':
  return gauss(v, 0, 300) + above(h, 18000, 1500)
case 'approach':
  return Math.max(gauss(v, -750, 550), gauss(v, 0, 250) - 0.5) + below(h, 12000, 1500)
```

`above(h, 18000, 1500)` costs nothing above 18,000 ft and grows steadily below it, so a cruise at 17,000 ft is possible but unlikely. Reports flagged as on the ground are almost certainly in the ground phase.

**Transition costs**: how likely is it to move from one phase to another? Only realistic changes are allowed at all. Ground can only become climb; cruise can become climb (a step climb), descent, or rarely a level-off; approach can become ground, or rarely climb again (a go-around). Ground to cruise is impossible, so it's never chosen however the numbers fall.

The cost of switching depends on time. I treat each phase as lasting about four minutes on average, so staying put for `dt` seconds costs `-dt / 240` and switching costs `log(1 - exp(-dt / 240))`. Two reports a second apart almost never change phase between them; two reports ten minutes apart easily might. Rare transitions cost an extra fixed penalty.

## Viterbi: the best explanation of the whole flight

The **Viterbi algorithm** finds the single most likely sequence of phases for the whole track. It walks the reports in order, and for each phase keeps the best score of any path that ends in that phase at that report, plus a pointer to where that path came from. At the end it picks the best final phase and follows the pointers backwards.

```ts
for (let to = 0; to < S; to++) {
  for (let f = 0; f < S; f++) {
    const extra =
      f === to ? stay : (ALLOWED[STATES[f]][STATES[to]] ?? NEVER) + move
    const candidate = score[f] + extra
    if (candidate > next[to]) [next[to], from[to]] = [candidate, f]
  }
  next[to] += emission(STATES[to], o)
}
```

It's `O(reports × phases²)`, a few thousand operations for a whole flight. Because every decision is made with the whole track in view, a single turbulent report can't flip a ten-minute cruise: switching to "climb" and back costs more than one bad emission score.

Recorded tracks don't carry vertical rate for every point, so where it's missing I work it out as the least-squares slope of altitude over the surrounding minute.

## A model that couldn't tell up from down

On real flights the first version produced sequences like climb, level, approach: an aircraft levelling off at 5,000 ft after take-off was then declared to be on approach. A first-order Markov model only remembers the current state, and "level" after climbing looks exactly like "level" before landing.

The standard fix is to split the hidden state. There are now two level states, shown to the user identically: _level on the way up_ can lead to more climbing, the cruise, or (on short hops) a descent; _level on the way down_ can lead to more descent or the approach. The model now remembers which side of the flight it's on without remembering anything else.

## A comparison that flattered me

To show the model was better, I compared how often each method changes phase over real flights. The first result was disappointing: 46 changes for the model against 53 for the thresholds.

The thresholds weren't flickering because the recorded tracks had no vertical rate, so I'd been working it out from a minute of altitudes. That smoothing had already removed the noise the model is meant to deal with. The live map doesn't get that smoothing: it uses the vertical rate each aircraft reports, which is noisy.

So I collected 24 more recorded flights, this time with the reported vertical rate (it's in the provider's track data, my parser had been throwing it away), and compared again:

![Dot plot of phase changes per flight for 24 recorded flights. For most flights fixed thresholds change phase far more often; the worst, the private aircraft N370RV, changes 21 times with thresholds and 4 times with the model](/images/airtrace/engineering/phase-changes.svg)

Across the 24 flights, fixed thresholds changed phase **172 times; the model 86**. The worst case, a private aircraft (N370RV) on a short hop out of Miami, went from 21 changes to 4. The tests also check that no flight ever goes straight from the ground to cruise, or from a climb through a level-off into an approach.

## Showing it

The aircraft card draws the phases as a strip along the flight's timeline. One more bug turned up there: each band ran to the start of the next, so an hour out of coverage between the climb and the cruise would be drawn as an hour of climbing. Silences longer than ten minutes are now drawn as their own hatched "No reports" band.

![The Flight analysis section of an aircraft card: a phase strip showing on the ground, a long climb, a brief level-off and cruise, and the line "Contrail likely: -53 °C outside, and they form below -44 °C at this height"](/images/airtrace/engineering/analysis.webp)

_An Airbus A380 from Gatwick to Dubai. The long climb is real: it took over 30 minutes to reach 41,000 ft._

## What it can't do

The emission scores are hand-tuned rather than learned, so an unusual aircraft (a glider, a helicopter, a fighter) can confuse it. It labels phases; it doesn't know intent, so a long level stretch at 9,000 ft on the way in is "level" whether it's a restriction from air traffic control or a pilot's choice. And with only 24 flights in the comparison, the exact ratio will move as more data comes in. The direction won't.

## Continue the series

[Previous: Smoothing positions with a Kalman filter](/blog/airtrace-engineering-02-kalman/) [Next: Spotting holds and go-arounds](/blog/airtrace-engineering-04-manoeuvres/).

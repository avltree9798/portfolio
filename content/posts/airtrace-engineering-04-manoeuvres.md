---
title: 'Airtrace engineering 4: spotting holds and go-arounds'
date: '2026-11-23'
summary: 'Detecting holding patterns by adding up turns over a sliding window, go-arounds with a small state machine, two off-by-one bugs, three Boston departures that looked like go-arounds, and keeping it fast enough for the whole flight list.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 4 of [Airtrace engineering](/blog/airtrace-engineering/).

Two things enthusiasts like to know about, and that the data never says directly: is this aircraft **holding**, flying racetrack circuits while it waits its turn to land, and did that one just **go around**, abandoning a landing and climbing away?

Both are shapes in a track. This part is about recognising them without false alarms.

## Holding: add up the turns

A hold is a racetrack: a straight leg, a 180° turn, another straight leg, another 180° turn in the same direction, repeated. The giveaway isn't the shape so much as the bookkeeping. If you add up every heading change, signed so that right turns are positive and left turns negative, a normal flight's total wanders around zero. A hold's total keeps growing, 360° per lap.

![Line chart of the running total of heading change for two laps of a racetrack hold: flat during each straight leg, rising 180 degrees during each turn, reaching 720 degrees after about ten minutes](/images/airtrace/engineering/hold-turn.svg)

So the detector keeps a running total of signed turn along the track (heading from the reported track, or the bearing to the next report when that's missing). Then, for every report, it looks back over at most 30 minutes for a window where:

- the total turn is at least 360°,
- every report is within 12 nm of the window's centre,
- the altitude varies by less than 3,000 ft (aircraft in a stack get stepped down 1,000 ft at a time), and
- the window lasts at least four minutes, so a single tight orbit doesn't count.

Overlapping windows merge into one hold. The laps are the total turn divided by 360, and the direction is the sign. Slow or low aircraft doing the same thing (below 150 knots or 3,000 ft on average) are labelled **circling** instead: helicopters, photo flights and police aircraft orbit; airliners hold.

### Two off-by-one bugs

The synthetic test, two laps of a standard hold with one-minute legs, came back as one lap. Twice.

The first cause: a window only counts once it's at least four minutes long, so the first window found started partway through the hold. Everything before it was left out of the lap count. The fix extends each confirmed window backwards over every earlier report that stays inside the same area: the hold began where the aircraft entered it.

The second cause was at the other end. One lap of a standard hold takes exactly four minutes. With a report every five seconds, the last full circle was four minutes minus one report, which failed the four-minute rule, and the loop gave up instead of looking further back. Changing a `break` to a `continue` made it keep searching for a window long enough. Both bugs were invisible on real data, where holds are rarely so neat, and obvious on a perfect synthetic one.

## Go-arounds: a state machine

A go-around is a sequence: descending towards an airport, getting low, then climbing away without landing. A small state machine follows it:

1. **Approaching**: descending, within 8 nm of an airport and below 3,000 ft above it.
2. Track the lowest height above the airport.
3. **Went around**: climbed at least 600 ft above that lowest point, from below 1,500 ft, without a report on the ground.
4. If it did touch down and climbed away within 90 seconds, it was a **touch-and-go** (a training circuit) instead. If it stayed down, it landed.

It passed its synthetic tests first time: a straight-in approach to Heathrow that goes around at 400 ft, a normal landing, and a departure.

### Three departures from Boston

Then I ran it over 35 recorded real flights, expecting nothing (none of them went around), and it flagged three: JBU1303, POE2618 and PVL7668, all **departing** Boston.

Just after take-off, the altitude reports wobble. A reading 50 ft lower than the one before, or a brief negative vertical rate, counted as "descending near an airport below 3,000 ft". The aircraft then climbed 600 ft, which is exactly what a departure does, and the state machine reported a go-around.

The fix encodes what an approach actually is. To start the approach state, the aircraft must have **come down from above**: been at least 500 ft higher within the previous three minutes. And it must not have left the ground at that airport in the last five minutes. With those two rules, all 35 flights pass with no false alarms, and the synthetic go-around is still caught.

The honest limit of that test: none of the recorded flights contains a real hold or go-around, so the positive cases are only tested synthetically. The real flights prove it stays quiet when it should; they don't yet prove it speaks up on a messy real event. That's the next thing to collect.

## Fast enough for the whole list

The flight list shows **HOLD**, **CIRCLING** and **GO-AROUND** badges, which means checking every listed aircraft, up to 250 of them, with tracks of up to 500 points. The hold search is quadratic in the window length. Running it for every aircraft on every two-second update would be noticeable on a phone.

Most aircraft can be ruled out cheaply:

- **Holding** needs at least 360° of total turn in the last 20 minutes. Summing the turns is one pass over the track; only aircraft that pass run the full detector.
- **Go-arounds** need the aircraft to have been below 4,000 ft recently.

Nearly every aircraft fails both, so the full detectors run for a handful at most. The check runs every 15 seconds rather than every update, which is plenty for something that takes minutes to happen. When a flight you follow starts holding or goes around while Airtrace is open, you get a message with a button to go to it.

## Continue the series

[Previous: Flight phases with a hidden Markov model](/blog/airtrace-engineering-03-phases/) [Next: Learning where receivers can hear](/blog/airtrace-engineering-05-coverage/).

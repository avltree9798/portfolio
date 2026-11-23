---
title: 'Airtrace engineering 1: where is a plane nobody can hear?'
date: '2026-11-23'
summary: 'Estimating the position of a flight that has left receiver coverage: dead reckoning, a destination that helps only slowly, a backtest on real flights, and finding a flight again by callsign.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 1 of [Airtrace engineering](/blog/airtrace-engineering/).

It started with a screenshot. I was following JAL44, London to Tokyo, and somewhere over the Caspian Sea it vanished. Airtrace showed where it had last been heard and nothing else. FlightAware, open in another tab, still showed the plane moving, labelled **ESTIMATED**.

Both sites had the same problem. ADS-B, the system aircraft use to broadcast their position, only works if a receiver on the ground hears it, and there are very few volunteer receivers over Central Asia. FlightAware fills the gap with the flight's filed flight plan. Flight plans aren't public data, and the providers that resell them want a commercial licence, so that wasn't an option for me.

What Airtrace does have is everything it heard before the plane went quiet. This part is about turning that into an honest estimate.

## Changing my mind

[The first article](/blog/building-airtrace/) said I refused to do dead reckoning: carrying an aircraft forward along its last speed and heading. That's still true for the live map. A marker on the map is always a real report, never a prediction, because a projected position looks exactly like a real one and is wrong whenever the plane turns.

An aircraft that has been out of coverage for an hour is a different case. The alternative to an estimate isn't a real position, it's nothing. So the estimate is only shown for a flight you're following that isn't in live data, it's drawn as a faded plane on a dashed line from where it was last heard, and it carries an uncertainty circle. Nobody will mistake it for a report.

![The map after tapping a followed flight that's out of coverage: an orange dot where it was last heard over Maine, a dashed line to a faded plane near Baltimore labelled "DAL85 · estimated · ±38 nm", and a small circle around it](/images/airtrace/engineering/estimate.webp)

_DAL85, Paris to Atlanta, with the last hour of its real track hidden. The estimate landed 6 nm from where the aircraft actually was._

## The algorithm

The estimator takes the reports Airtrace has (from the live feed, the account's background checks, and the provider's recorded track for the day) and flies the aircraft forward.

**1. Work out the velocity.** The last report says the aircraft's ground speed and track. On its own that's fragile: one noisy reading, or a report caught halfway through a turn, sends the whole estimate off at an angle. So I also take the great-circle bearing and speed from a report 2 to 20 minutes earlier to the last one, and average the two headings. If they disagree by more than 45°, the aircraft has just turned, and the latest report wins.

```ts
track:
  headingDifference(reported.track, derived.track) <= 45
    ? meanHeading(reported.track, derived.track)
    : reported.track,
```

`meanHeading` averages angles as unit vectors, so 350° and 10° average to 0°, not 180°.

**2. Fly it forward in 30-second steps along a great circle.** A great circle is the shortest path between two points on a sphere, and airliners roughly follow one. Flying a constant compass heading instead would curve away from it. Each step moves the aircraft along its current bearing and then updates the bearing to where the great circle now points.

**3. Steer towards the destination, slowly.** If the flight's destination is known (from the user or the callsign's usual route) and roughly ahead, the aircraft turns towards it. How much it's allowed to turn is the interesting part, and I got it wrong first; more on that below.

**4. Arrive.** Once the distance left is 3 nm for every 1,000 ft it has to lose (the standard rule of thumb for a descent), it starts down, slowing to 420 knots above 10,000 ft, 250 below and 160 on final approach. Within 3 nm of the airport it has "probably landed", with a time.

**5. Say how sure it is.** The uncertainty radius grows with distance flown: 5% for speed (winds aloft can easily be 100 knots), plus the sideways drift a heading error causes, 6° without a destination and 2° with one. After four hours it gives up.

## Testing it against reality

I saved the recorded tracks of 11 real flights and wrote a backtest. It walks along each track, and at every well-covered moment hides everything after it, estimates where the aircraft will be 15, 30, 60, 90 and 120 minutes later, and measures the distance to where it actually was. That gave 167 test cases.

My first version steered at the full 3° a minute from the start. The backtest showed it was worse than doing nothing clever at all for short gaps: a median error of 12 nm after 15 minutes, against 2 nm for plain dead reckoning.

Looking at the cases explained why. Airliners rarely point straight at their destination. They follow airways, oceanic tracks and routes around closed airspace. For the first hour or so, the direction an aircraft is actually flying is a much better guide than a straight line to where it's going. But over several hours, flights do converge on their destinations, and plain dead reckoning drifts badly.

So the steering builds up. For the first minutes it barely turns; after three hours it turns at the full rate. Close to the destination (150 nm) it heads for the airport regardless. I tried ramps of 60, 120, 180, 240 and 360 minutes against the backtest, and 180 gave the best balance.

![Line chart of the 80th-percentile error against minutes since the flight was last heard. Dead reckoning rises from 10 nm at 15 minutes to 311 nm at two hours; the Airtrace estimate rises from 10 nm to only 70 nm](/images/airtrace/engineering/estimate-backtest.svg)

Errors are shown as median / 80th percentile. There are 65 cases at 15 minutes, falling to 8 at two hours, because fewer flights were tracked for that long without a gap.

| Gap     | Dead reckoning | Airtrace   |
| ------- | -------------- | ---------- |
| 15 min  | 2 / 10 nm      | 2 / 10 nm  |
| 30 min  | 9 / 29 nm      | 10 / 22 nm |
| 60 min  | 31 / 107 nm    | 34 / 49 nm |
| 90 min  | 38 / 195 nm    | 45 / 53 nm |
| 120 min | 74 / 311 nm    | 66 / 70 nm |

The medians are about the same; what changes is the bad cases. Plain dead reckoning is fine until an aircraft turns, and then it's hundreds of miles out. The estimate's bad cases stay within about ten minutes' flying.

The uncertainty circle got the same treatment. My first formula was too confident: only 61% of the real positions fell inside it. After the steering change the error shrank, and 85% now fall inside. The backtest is part of the test suite, so if a later change makes either number worse, the build fails.

## Update: real gaps are harder

Everything above hides part of a track that was fully covered, which is the easy case. A real gap happens where coverage is poor, often on a detour, so I later measured the estimate on 19 gaps that really happened, from 9 flights.

The result was less flattering. The median error was 20 nm against 18 nm for plain dead reckoning, so the estimate isn't better in the middle of the distribution. It does still help in the bad cases (80th percentile 37 nm against 76 nm). Only 74% of real positions fell inside the circle, not 85%. The worst miss was a flight that turned about 96° during a 109-minute gap and ended up 219 nm from where I put it.

I made the circle twice as large, which puts 84% of those 19 inside. That's a small sample, so treat it as a rough calibration, not a guarantee. The measurement is now a test in the repository.

## Finding a flight again

The same night, I accidentally stopped following JAL44 and couldn't get it back: search only covered the area loaded around the map, and JAL44 was far outside it. So a search for a callsign that has no match nearby now offers to look everywhere:

1. Ask the provider for that callsign live. If someone hears it, go straight to it.
2. If not, find which aircraft flew that callsign in the last week (the provider keeps a table of observed flights), and check each one's recorded track for today, newest first, at most four.
3. A track only minutes old means the aircraft is being heard right now after all. Look it up by its 24-bit address instead and return the live aircraft.

For JAL44 it found the aircraft (an Airbus A350-1000 registered JA11WJ), its destination, and a report from a minute earlier, and placed it with a ±4 nm circle.

### A third step that was hiding two bugs

I added that third step because the first one kept missing flights that were plainly being heard, and I explained it to myself as "some live reports don't carry the callsign". That explanation was wrong, and I wrote it into this article before I'd checked. A day later, trying to follow a callsign before its flight existed, I found the live callsign lookup had never worked at all, for two separate reasons:

- The provider answers a callsign lookup with the aircraft itself, not the list of aircraft every other lookup returns. My code checked for the list, called the answer invalid, and gave up. I found this only after making the failure visible: the error now says which endpoint it called and what the response's keys were, which was all it took.
- Elsewhere in the Worker, aircraft the feed had already cleaned up were run through the same parser a second time. The parser looks for the raw feed's field names, so the second pass quietly erased each aircraft's callsign, altitude and speed. Several notifications had been broken by it since the first alerts shipped, and every test passed, because the tests fed those code paths raw data rather than what the feed really returns.

The address lookup in step 3 is still a sensible fallback. But the lesson is the one the other articles keep arriving at from different directions: when a fallback exists to explain a surprising failure, find the failure first. A plausible story is not evidence, and a test is only as honest as the data it's fed.

## What it can't do

It doesn't know about turns that happen after the plane goes quiet. A flight that routes around closed airspace, or holds, or diverts, will be further out than the circle suggests. Eleven flights is a small sample, so the numbers are a guide rather than a guarantee. And it's no substitute for a filed flight plan; it's what you can do honestly without one.

## Continue the series

[Back to the series](/blog/airtrace-engineering/). [Next: Smoothing positions with a Kalman filter](/blog/airtrace-engineering-02-kalman/).

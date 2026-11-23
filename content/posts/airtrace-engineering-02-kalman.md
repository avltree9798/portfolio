---
title: 'Airtrace engineering 2: smoothing positions with a Kalman filter'
date: '2026-11-23'
summary: 'Filtering noisy aircraft positions with a Kalman filter that uses the velocity aircraft broadcast, rejecting bad fixes with a Mahalanobis gate, and drawing turns as Hermite curves instead of straight lines.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 2 of [Airtrace engineering](/blog/airtrace-engineering/).

Airtrace gets a new position for each aircraft every two seconds or so, and animates the marker between them. For a long time that animation was a straight line from the old position to the new one. Two things were wrong with it.

First, positions are noisy. A position worked out by multilateration (MLAT: several receivers timing the same signal, used when an aircraft doesn't broadcast its own position) can be hundreds of metres off, and now and then a fix is miles away. The marker would jump to it and back.

Second, straight lines cut corners. When updates are far apart, on a slow backup feed or at the edge of coverage, a turning aircraft visibly slides across the inside of its own turn.

## A Kalman filter in one paragraph

A Kalman filter keeps a best guess of some hidden state (here, position and velocity) together with how uncertain that guess is, as a covariance matrix. Each time a measurement arrives it does two things. It **predicts**: moves the state forward by the time elapsed using a simple motion model, and grows the uncertainty because the model isn't perfect. Then it **updates**: blends the prediction with the measurement, weighting each by how much it trusts it. A noisy measurement moves the estimate a little; a precise one moves it a lot.

## The model

The state is four numbers: position east and north in metres, and velocity east and north in metres per second, on a flat grid centred on the aircraft's first report. Flat is fine over a couple of hundred kilometres, so the grid re-centres when the aircraft strays more than 200 km from its origin.

The motion model is constant velocity with random acceleration of about 3 m/s². That's enough to cover turns and speed changes without letting the filter wander. Over a time step `dt` the prediction is:

```ts
const F = [
  [1, 0, dt, 0],
  [0, 1, 0, dt],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]
const x = mulVec(F, this.x)
const P = add(mul(mul(F, this.P), transpose(F)), Q)
```

where `Q` is the standard process noise for white-noise acceleration: it grows with `dt³` and `dt⁴` because an unknown acceleration acting for longer moves you further.

## Measuring velocity, not just position

Most explanations of tracking with a Kalman filter assume you only measure position and the filter has to infer velocity. ADS-B is kinder: every aircraft broadcasts its ground speed and track, measured by its own navigation system, which is far more precise than anything you could work out from positions two seconds apart. So the filter measures all four numbers. Velocity gets a noise of 2 m/s; position gets its noise from the aircraft's own accuracy report.

That accuracy report is the **NACp**, the navigation accuracy category for position, a number from 0 to 11 that every ADS-B position carries. Each category is an upper bound on the 95% position error: 9 means within 30 m, 7 within 185 m, 5 within 926 m. MLAT positions carry no NACp, so they get 300 m. An aircraft that says it knows its position to 10 m is trusted almost completely; an MLAT fix is pulled firmly towards the prediction.

## Throwing out bad fixes

The filter knows how far off it expects the next position to be: that's the covariance of the difference between measurement and prediction, called the innovation. The **Mahalanobis distance** measures the actual difference in units of that expected spread, in every direction at once. If the squared distance is over 16, about four standard deviations, the position is ignored and the prediction stands.

That alone has a failure mode. If an aircraft really does jump (a long gap in coverage, or the filter being wrong about it), every new report will be rejected forever. So three rejections in a row restart the filter from the latest report: when several reports agree, the aircraft really is there. A gap of more than two minutes also restarts it, since the prediction is no longer worth much.

## Drawing curves

Between two filtered states, the marker follows a **cubic Hermite curve**: the cubic that starts at the first position heading in the first velocity's direction, and ends at the second position arriving with the second velocity. In one dimension, for a fraction `t` of the way between them:

```ts
const h10 = t ** 3 - 2 * t ** 2 + t,
  h01 = -2 * t ** 3 + 3 * t ** 2,
  h11 = t ** 3 - t ** 2
const p = h10 * m0 + h01 * p1 + h11 * m1
```

`m0` and `m1` are the tangents: they point along each state's velocity, and their length sets how far the curve bulges. The curve's derivative gives the direction the marker should point at each moment. How long to make the tangents turned out to matter a great deal; see below. `t` is clamped between 0 and 1. The curve never extends past the latest report, so the promise from the first article still holds: the map never shows a position that wasn't measured.

## Testing it

The filter's own tests are synthetic: a straight track with 150 m of noise (the filter at least halves the error), a single 5 nm wild fix (ignored), and three agreeing reports after it (followed).

The curve needed real data. I took the saved tracks of real flights, found every pair of reports 20 to 90 seconds apart around a turn of at least 20°, and used the reports in between as checkpoints: how close does each method pass to where the aircraft actually was?

![A real turn by DAL37 of 104 degrees between two reports 48 seconds apart. Twenty-one hidden reports trace an arc; the Hermite curve follows them closely, while the straight dashed line cuts across the inside of the turn](/images/airtrace/engineering/hermite-turn.svg)

That turn is the clearest example: DAL37 turning 104° in 48 seconds, with 21 reports in between. The curve misses them by 102 m on average; the straight line by 717 m. Across all 3,223 checkpoints in the recorded flights, the median miss was **35 m for the curve and 144 m for the straight line**.

## The wobble

The first version sized the tangents the textbook way: each state's velocity multiplied by the time between the two states. It passed every test, including the backtest on real turns. Then I watched it on my phone and every aircraft on the map was wagging its nose back and forth.

The tests had used the recorded tracks' timestamps, which are exact. The live map didn't have those. It worked out each report's time as the browser's clock minus the report's age, and the browser's clock includes however long the data took to arrive: network latency, plus up to several seconds of queueing when requests compete for the shared API slot. Two reports really two seconds apart could be timestamped six seconds apart. The tangents came out three times too long, the curve overshot the new position and swung back, and the marker, pointing along the curve, swung its nose with it.

I measured it with a headless browser sampling every marker's rotation five times a second for 20 seconds on the live map: 14 of 24 markers swung back and forth, one by 2,876° in total.

Two changes fixed it. Reports are now timed by the data source's own clock, which stamps each snapshot. And, more fundamentally, the curve's shape no longer depends on time at all. The tangents are sized by the straight-line distance between the two positions (the chord), so the curve can't overshoot either end whatever the timestamps say. Plain chord length flattens sharp turns, though: DAL37's turn got worse, from 52 m to 153 m. For a circular arc turning through an angle θ, the cubic that matches it best has tangents of chord × 2·tan(θ/4) / sin(θ/2), which is 1 for a straight line and about 1.24 for a 104° turn. That uses only the angle between the two headings, so it's still independent of timing, and it brings the turn back to 102 m.

```ts
const arc = theta < 1e-3 ? 1 : (2 * Math.tan(theta / 4)) / Math.sin(theta / 2)
const chord = Math.hypot(p1[0], p1[1]) * arc
```

After the fix, the same measurement found no markers swinging back and forth; the few that changed heading were turning steadily one way. A test now feeds the curve two reports with deliberately wrong timestamps and checks it never moves backwards or swings its heading.

The lesson I'd take from it: a backtest is only as good as the inputs it shares with production. Mine used clean timestamps the live app never sees.

## Two honest caveats

The first backtest I ran found almost no improvement. Turns in the recorded tracks are densely reported, a position every six seconds or so, and over six seconds a turn hardly curves. Both methods missed by about the same amount, which is just rounding and receiver noise. The curve earns its keep when updates are sparse: backup feeds that refresh every three minutes, aircraft at the edge of coverage, or a phone that has been in your pocket. On the main two-second feed you mostly won't see the difference.

And I wrote two tests wrongly before the filter was right. One used a turn radius three times too large, so the positions said 750 knots while the velocities said 250. The other fed in "agreeing" reports that moved 70 metres every two seconds while claiming 450 knots. Both failed for good reasons. When a test of a physical model fails, check the test's physics first.

## Continue the series

[Previous: Where is a plane nobody can hear?](/blog/airtrace-engineering-01-estimates/) [Next: Flight phases with a hidden Markov model](/blog/airtrace-engineering-03-phases/).

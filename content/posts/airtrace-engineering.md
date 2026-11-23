---
title: 'Airtrace engineering: seven small algorithms, tested on real flights'
date: '2026-11-23'
summary: 'A seven-part series on the algorithms behind Airtrace: estimating where an unheard plane is, Kalman filtering, a hidden Markov model for flight phases, holds and go-arounds, learned receiver coverage, sunlight and contrails, and route detours.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

[Airtrace](https://adsb.avltree9798.co.uk) is my flight tracker. [The first article](/blog/building-airtrace/) covered the plumbing: sharing one rationed API between every visitor, failing over between providers, and moving aircraft smoothly without guessing where they'll be.

This series is about what came next. Each part takes one question that the raw data doesn't answer and builds a small algorithm to answer it:

1. [Where is a plane nobody can hear?](/blog/airtrace-engineering-01-estimates/) Dead reckoning, and why steering towards the destination made it worse before it made it better.
2. [Smoothing positions with a Kalman filter](/blog/airtrace-engineering-02-kalman/) Filtering noisy reports, throwing out bad fixes, and drawing turns as curves.
3. [Flight phases with a hidden Markov model](/blog/airtrace-engineering-03-phases/) Climb, cruise and approach without the flicker of fixed thresholds.
4. [Spotting holds and go-arounds](/blog/airtrace-engineering-04-manoeuvres/) Adding up turns, a small state machine, and three Boston departures that weren't go-arounds.
5. [Learning where receivers can hear](/blog/airtrace-engineering-05-coverage/) A hexagonal coverage map built from every position heard, and predicting when a flight will be heard again.
6. [Sunlight at altitude, and contrails](/blog/airtrace-engineering-06-sky/) Why a plane can shine after sunset, and the physics of when it leaves a trail.
7. [How far off the direct route?](/blog/airtrace-engineering-07-detours/) Great circles, cross-track distance, and not guessing why.

## How each one was built

The pattern is the same in every part, and it's the part I'd most like to pass on.

**Start from real data.** I saved the recorded tracks of 35 real flights from FlyItalyADSB (CC BY-SA 4.0): transatlantic crossings, Paris to Hong Kong, US domestic hops and a few light aircraft. They live in the test suite as fixtures.

**Measure against reality, not against intuition.** Every algorithm is checked by hiding part of a real flight and comparing the guess with what actually happened, or by running it over all 35 flights and looking for false alarms. The numbers in these articles come straight out of those tests, and the tests fail if a later change makes them worse.

**Write the mistakes down.** Several first versions were wrong in ways that only real data showed: a heuristic that made estimates worse, a comparison that looked good only because the data was already smoothed, a detector that called departures go-arounds. Each part says what went wrong and how it was found.

**Don't claim more than the data supports.** Airtrace still never moves a live aircraft beyond its latest report. Estimates are drawn faded, labelled, and given an uncertainty circle. Phases, holds and detours describe what was observed, not why. Contrails are "likely" or "possible" because humidity isn't broadcast. A flight tracker that looks certain about everything is easy to build and quietly wrong.

## What you need to follow along

The code is TypeScript, and each algorithm is a pure function in a few hundred lines at most. You don't need an aviation background; terms like "great circle" or "NACp" are explained when they first come up. A little geometry and probability helps for parts 2 and 3, but the ideas come first and the maths second.

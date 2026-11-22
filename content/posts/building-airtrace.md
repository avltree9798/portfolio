---
title: 'Building Airtrace: an honest flight radar on Cloudflare Workers'
date: '2026-11-22'
summary: 'How one Durable Object shares a free API plan between every visitor, why the map never predicts a position, and the small geometry tricks behind a radar scope, runway inference and replay.'
tags: ['aviation', 'Cloudflare Workers', 'Vue', 'engineering']
draft: false
---

[Airtrace](https://adsb.avltree9798.co.uk) is a live flight radar I built for myself: a map of aircraft, the detail of each flight, the airports they use and a few tools for plane spotting. It is a Vue 3 and TypeScript single-page app with Leaflet for the map, served by a Cloudflare Worker that fronts community ADS-B feeds.

![Airtrace's live map over New Jersey, with American Airlines flight AAL1452 selected and its telemetry in the side panel](/images/airtrace/map.webp)

_The live map with two-second updates. Map data © OpenStreetMap contributors; aircraft data from FlyItalyADSB (CC BY-SA 4.0)._

Most of the interesting engineering came from two constraints. The data is free but rationed, and it is much less certain than a polished map makes it look. This post covers how the backend shares a small API allowance between everyone, how the frontend moves aircraft smoothly without inventing positions, and the small geometry tricks behind the spotting tools. It ends with the bugs that only appeared in production.

## One object, one budget

ADS-B data comes from volunteers' receivers, aggregated by community networks. The primary source, FlyItalyADSB, gives a free key 300,000 requests a month and 30 a minute. That is plenty for one person and nowhere near enough if every open browser tab polls on its own.

So no browser talks to a provider. Every request goes to a Worker, which forwards it to a single, globally named Durable Object with SQLite storage. Because Cloudflare guarantees one instance of a named object, it becomes the one place where the budget, the cache and the cooldowns live:

- **Requests are quantised.** The map centre is rounded to a two-degree grid before it leaves the browser, and each grid cell becomes a 250 nautical mile query. Everyone looking at roughly the same area shares one cached snapshot, and the object keeps at most 32 of them.
- **Upstream calls are serialised.** Cache misses run one at a time inside the object, with at least two seconds between upstream requests. That keeps the whole site under 30 a minute however many people are watching.
- **The budget is reserved before the call.** A failed request still counts against the provider allowance, so the counter goes up before the `fetch`, not after. Airtrace stops at 290,000 a month, leaving headroom below the plan.

Rounding the centre was a privacy decision as much as a caching one: the precise device location never reaches the server or the provider.

## Failing over without lying

There are three providers in a chain: FlyItalyADSB, then ADS-B.lol (450 requests a day, cached for three minutes), then AvioADSB (90 a day, a smaller radius). Each has its own budget, cache keys and cooldown policy. Authentication failures back off for 15 minutes, rate limits honour `Retry-After` with a three-minute minimum, and anything else retries after 30 seconds. Timeouts are 12 seconds for the primary and 5 for each backup, so the whole chain finishes inside the Durable Object's time limit for serialised work.

The rule I care about most is that sources are never blended. A snapshot comes from exactly one provider, and that provider's name and licence travel with it to the status bar and to JSON exports. When every source fails, the newest cached snapshot is returned with `stale: true` and the interface says so. There are no estimated positions to fill the gap.

One provider refused all traffic from the Worker while the same request from my laptop succeeded. Cloudflare's block page and documentation explained it. For Worker subrequests that cross into another Cloudflare zone, the `CF-Connecting-IP` header carries a fixed Cloudflare address, and the target zone's firewall can see the request came from a Worker. A provider on Cloudflare can therefore block Workers as a group, which is what happened. No API key gets around a firewall rule, so Airtrace labels the fallback and moves on.

## Smooth, but never ahead of the data

A map that redraws every two seconds looks jerky, and the usual fix is dead reckoning: carry each aircraft forward along its last speed and track. I refused to do that. A projected position looks exactly like a real one, and it is wrong whenever the aircraft turns.

Instead, each marker eases between the last two measured positions over 1.8 seconds and then stops. The only subtlety is taking the short way round, for both longitude at the date line and heading at north:

```ts
const shortTurn = (start: number, end: number) =>
  ((end - start + 540) % 360) - 180
```

That maps any difference into the range −180° to 180°, so 350° to 10° turns 20° clockwise instead of 340° the long way. Markers snap rather than glide after a jump of more than 30 km. Animation stops when data is stale or paused, and also when the user asks for reduced motion. Only aircraft inside a slightly padded viewport get a DOM marker at all, which keeps New York at rush hour responsive.

Following a flight exposed a quieter bug. Panning the Leaflet map can fire `moveend` synchronously, and the move handler re-centres on the followed aircraft, which pans again. The fix is small: record the camera target _before_ calling `panTo`, and ignore a move request for the target you are already heading to.

## Separating an aircraft from its flight

ADS-B identifies the **airframe**, a 24-bit address that stays with the aircraft, and broadcasts a **callsign**, which an airline reuses every day and sometimes for different legs. Neither one tells you where the aircraft is going today.

FlyItalyADSB attaches a usual route to a callsign with its evidence: `count`, how often the callsign flew that pair in the last seven days, and `last_day`. Airtrace grades that evidence. Five or more flights with the latest within two days is strong, three or more within a week is moderate, and anything else is weak. Only strong or moderate evidence fills in the journey estimate automatically; weak evidence becomes a button. Every grade ends with "not a confirmed flight plan for today".

Legs come from the recorded track. A new leg starts only where the provider marks one, or where consecutive samples less than two minutes apart show the aircraft leaving the ground. A forty-minute gap over the sea is a gap in coverage, not a new flight. The same idea runs through coverage: when an aircraft stops reporting, the card says a landing is possible only if the last position was low and near an airport. Otherwise it reads "most likely a gap in receiver coverage".

![The aircraft card showing the airframe's model and build year, followed by separate airframe, callsign and flight-leg entries](/images/airtrace/card.webp)

_Profile and identity for one airframe. The provider supplies the model and build year; it publishes no operator, so the operator is labelled as inferred from the callsign._

## A radar scope in twenty lines

"What's overhead?" takes one location reading and does everything else in the browser. For each aircraft it computes the great-circle distance and the initial bearing from the observer. It then compares the aircraft's ground track with the bearing from the aircraft back to the observer. Within 60° it is approaching, beyond 120° it is moving away, and in between it is passing.

Drawing the scope is the same bearing turned into SVG coordinates. Distance becomes a fraction of the radius; screen `y` grows downwards, so north is negative:

```ts
const r = Math.min(1, distanceNm / radiusNm)
const x = r * Math.sin(bearing * radians)
const y = -r * Math.cos(bearing * radians)
```

![A circular, north-up radar scope with three aircraft labelled by callsign around the observer near JFK](/images/airtrace/overhead.webp)

_The overhead scope under the JFK approaches, 10 nm radius. Positions older than 60 seconds are left out: at 450 knots an aircraft moves seven and a half miles in a minute._

## Inferring runways from public data

OurAirports publishes threshold coordinates for most runways: 5,841 of the 6,428 runways in Airtrace's dataset. With both ends you can draw the runway and compute the true heading of each direction. An aircraft descending towards an airport within 15 nm, on a track within 20° of a runway heading, counts as an arrival on that runway.

The first version worked until I looked at JFK. Runways 13L and 13R share a heading, so every aligned aircraft was credited to whichever runway came first in the list. Heading narrows the choice, but position decides it. Among runway directions with a matching heading, Airtrace picks the one whose extended centreline is nearest to the aircraft, using the cross-track distance from spherical trigonometry:

```ts
const angular = distanceKm(threshold, aircraft) / 6371
const relative = (bearingTo(threshold, aircraft) - runwayHeading) * radians
const offsetNm =
  Math.abs(Math.asin(Math.sin(angular) * Math.sin(relative)) * 6371) / 1.852
```

After that change JFK showed arrivals on 13L and departures on 13R, which is how it usually runs that configuration. The panel still says this is inference from received tracks, not ATIS.

![The airport explorer for JFK, with runways drawn on the map, nearby aircraft, and inferred arrivals on runways 22L and 22R in the side panel](/images/airtrace/airport.webp)

_JFK's runways drawn from OurAirports threshold coordinates (public domain), with live traffic and inferred runway activity._

## Replay that follows the data

The replay steps through recorded positions rather than a model. Trails can be coloured by altitude or speed, and altitude and speed charts share the replay's time axis: the cursor follows playback, and selecting a point on either chart seeks to it. Charts and trails break at gaps of more than five minutes rather than drawing a confident straight line through the missing part.

![Replay paused part-way through a climb out of Philadelphia, with the map in replay mode and altitude and ground-speed charts showing a shared cursor](/images/airtrace/replay.webp)

_Replay of a departure from Philadelphia. The white line on both charts marks the replay position._

A user report caught the most visible bug in this feature: a replayed aircraft pointing north while it flew south-west. When the feed omitted a track, the normaliser had stored `0`, which is a perfectly valid heading. Missing values are now `null`. Replay uses the recorded track, otherwise the bearing between consecutive recorded points (never across a gap), otherwise the last known track.

## Installable, and offline only where that is honest

Airtrace installs as a web app with a service worker. The caching policy is a single pure function, which made it testable: the tests load the worker source into a Node `vm` sandbox with a stub `self` and call the function directly. Same-origin `GET` requests for the app shell, hashed assets, icons and the bundled airport data can be cached. `/api/` requests and every cross-origin request, including map tiles and photographs, always go to the network. Offline, the app opens with a notice, and your spotting log and settings are still there. Live tracking says it needs a connection.

## Your own receiver, without server-side fetching

Airtrace can also accept data from a personal readsb receiver. The obvious design is to give the server a receiver URL to poll, but that turns the Worker into a proxy that fetches arbitrary addresses. Instead, a small bridge next to the receiver pushes `aircraft.json` to the Worker with a bearer token. The token is a Cloudflare secret compared in constant time, and uploads are refused until it exists. Bodies are capped at 1 MiB, uploads more than a minute old are rejected, and the stored view expires after 15 seconds. Receiver data replaces community data only near the station, and the two are never mixed. I have not bought the hardware yet, so this is tested against recorded readsb output rather than a real antenna.

## What production taught me

Each of these passed the test suite and broke in production:

- **A 404 that cooled down every lookup.** The profile endpoint returns 404 for aircraft it has never tracked, and the feed object treated that as a provider failure: thirty seconds of cooldown for every aircraft. Misses are now cached as empty profiles.
- **A request slot nobody could win.** Profiles worked with `curl` but never in the app, because an open map polls every two seconds and takes every two-second upstream slot. Rare, user-initiated lookups now wait up to 2.5 seconds for the next slot inside the object, which already serialises requests. Cooldowns and exhausted budgets are never waited out.
- **The north-pointing replay** and the **parallel runways** described above.
- **An airport search that emptied the map.** Choosing an airport from the search left its code in the query, which also filters aircraft.
- **Deferred object updates.** Cloudflare can keep running old Durable Object code for a few minutes after a deploy. Changes to the object's contract must stay backward compatible, and releases that need the new code at once are activated explicitly.

Every fix came with a regression test. The project now has 137 of them, covering domain logic, Worker contracts and the shared feed object, plus a browser walkthrough of each feature against the live site.

If there is one lesson, it is that most of a data product's honesty lives in small decisions: a `null` instead of a `0`, a grade instead of a destination, "possible" instead of "landed". Each one is a line of code, and together they decide whether the map can be trusted.

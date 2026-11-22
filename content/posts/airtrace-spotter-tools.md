---
title: 'Teaching a flight radar to say “probably”'
date: '2026-11-22'
summary: 'Adding spotter tools, an airport explorer and receiver uploads to Airtrace, my Vue and Cloudflare Workers flight radar, without letting inference pass for fact.'
tags: ['aviation', 'Cloudflare Workers', 'Vue', 'engineering']
draft: true
---

[Airtrace](https://adsb.avltree9798.co.uk) is my flight radar. It is a Vue 3 and TypeScript single-page app served by a Cloudflare Worker, with one shared Durable Object that caches community ADS-B feeds and protects their request budgets for every visitor. This release adds the tools I actually want when I am standing in a field looking up: what is overhead, which runway is in use, whether that aircraft is the one I was waiting for, and what happened when it vanished from the map.

All of those questions invite a confident answer the data cannot support. ADS-B tells you where an aircraft says it is, its altitude, its speed and the callsign it is broadcasting. It does not tell you where the aircraft is going, which flight it is operating or why it stopped reporting. Most of the work in this release went into labelling things that are probably true as “probably”.

## An airframe is not a flight

The aircraft card used to show a callsign, a registration and a route as if they were one thing. They are three:

- The **airframe**, identified by its registration and 24-bit ICAO address. It is the same physical aircraft every day.
- The **callsign**, such as `EZY8054`. Operators reuse it daily, sometimes for different legs.
- The **flight leg**: one take-off to one landing.

The card now shows each one separately. Legs come from the recorded track: a new leg starts where the provider's track marks one, or where consecutive samples less than two minutes apart show the aircraft going from the ground to airborne. A long gap in coverage does not start a new leg, because an aircraft that disappears over the sea for forty minutes is usually still on the same flight.

The route needed the same care. FlyItalyADSB, the primary feed, can attach a usual route to each aircraft. Its documentation describes the shape exactly:

```json
{
  "from": "EGSS",
  "to": "EIDW",
  "count": 12,
  "last_day": "2026-11-05",
  "source": "observed"
}
```

`count` is how many times the callsign flew that pair in the provider's last seven days, and `last_day` is the most recent. The previous version of Airtrace parsed `from` and `to` and threw the evidence away. Now it grades it: five or more flights with the latest within two days is strong, three or more within a week is moderate, and anything else is weak. During production checks one callsign arrived with `count: 2` and `last_day` six days earlier. That is weak evidence, so the journey estimate is no longer filled in automatically; the card offers the usual route as a button instead. Every grade ends with the same sentence: this is the callsign's usual route, not a confirmed flight plan for today.

## Disappearing is not landing

Coverage now has its own section. Positions are labelled by how they were obtained: ADS-B broadcast by the aircraft, MLAT calculated from the time a signal arrived at several receivers, or a TIS-B or ADS-R rebroadcast. Each label shows its age. MLAT gets an explicit warning, because its error can be far larger than a GPS-derived ADS-B position.

The most important change is what happens when an aircraft stops reporting. If the last position was low and within 12 nm of an airport, the card says a landing is possible but not confirmed, because coverage near the ground is often poor. Anywhere else it says the gap is most likely receiver coverage and is not evidence of a landing. Trails, charts and replay all break at gaps longer than five minutes instead of drawing a straight line through them.

## What's overhead?

The overhead view takes one browser location reading and does everything else on the device. For each airborne aircraft it computes the great-circle distance and the initial bearing from the observer, then compares the aircraft's ground track with the bearing from the aircraft back to the observer:

- within 60°: approaching
- more than 120° away: moving away
- in between: passing

The results appear on a north-up radar scope or as a large-print list for using outdoors. The location never leaves the browser; the flight API still receives only a regional centre rounded to a two-degree grid.

I chose to leave out positions older than 60 seconds. At 450 knots an aircraft travels seven and a half nautical miles in a minute, so an older position is the wrong place to point a camera. That matters because Airtrace falls back to a three-minute feed when the primary is unavailable. Rather than show stale aircraft in the scope, the overhead view says the current feed is too slow for spotting.

Watchlists sit next to it. You can watch a registration, an ICAO type such as `A388`, or a three-letter airline prefix. Matches get a ring on the map, a count on the toolbar and an alert while the page is open. Rules stay in local storage. There are no accounts and nothing runs once the tab is closed.

## Runways from public data

[OurAirports](https://ourairports.com/data/) publishes threshold coordinates for most runways. Adding them to the import gave positions for 5,841 of the 6,428 runways in the bundled dataset, enough to draw the layout when you open an airport and to calculate the true heading of each runway direction.

From there the airport explorer infers runway activity. A climbing or descending aircraft within 15 nm whose track is within 20° of a runway heading counts towards that runway direction. Take-offs and landings are listed only when consecutive samples less than two minutes apart, within 5 nm, show the change while the page is open. The panel says plainly that this is inference from received tracks, not the runway in use from ATIS, and not a flight board.

## Charts that move with the replay

Earlier releases could replay the recorded points of a flight. Trails can now be coloured by altitude or ground speed, and the replay section has altitude and speed charts on the same time axis. The cursor follows the replay, and selecting a point on either chart replays from that moment. The chart series uses the same rule as the map: a missing value or a gap of more than five minutes ends the line.

## Profiles, and checking the API before trusting the code

I picked this release up from a half-finished branch. Its profile code called `/v2/profile/{icao}` and expected manufacturer and operator fields. Before building on it I read the provider's documentation. The endpoint exists, but it returns registration, type, a model description such as `BOEING 777-200LR`, a build year when the aircraft database has one, and tracking history. It never returns operators. So the card shows build year and age when they are supplied, shows the operator as inferred from the callsign, and says the provider does not publish liveries. Aircraft in the PIA and LADD privacy programmes have their photographs withheld.

Production testing found two problems the unit tests had not.

First, the provider returns 404 for aircraft it has never tracked. The shared feed object treated that as a provider failure and cooled down every profile lookup for 30 seconds. Now a 404 is cached as an empty profile for the normal 24 hours.

Second, the profile card kept failing in production even though `curl` succeeded. The Durable Object spaces all upstream requests at least two seconds apart, to stay within the provider's free plan of 30 requests a minute. An open page polls live positions every two seconds, so the live feed took every slot and the profile request was refused each time, even with client retries. The fix was to let rare, user-initiated lookups wait up to 2.5 seconds for the next slot inside the object, which already serialises requests. Provider cooldowns, authentication failures and exhausted budgets are still never waited out. Both fixes have regression tests, and after redeploying, a 767's profile loaded while the map was polling every two seconds.

## Installable, but never stale

Airtrace now has a web manifest, icons and a service worker. The worker's caching rule is a single function, run in a Node `vm` sandbox by the tests: same-origin `GET` requests for the app shell, hashed assets, icons and bundled airport data can be cached; `/api/` requests and every cross-origin request, including map tiles and photographs, go straight to the network. Offline, the app opens with a notice, and the spotting log, favourites and settings stored in the browser remain available. Live tracking needs a connection, and the app never pretends otherwise.

## A receiver bridge without a receiver

The last piece lets a readsb receiver push its own observations. A small command-line bridge reads the receiver's `aircraft.json` and posts it to `/api/receiver` with a bearer token. The Worker never fetches a URL you give it, so there is no server-side request forgery surface. The token is a Cloudflare secret compared in constant time, and the endpoint refuses every upload until that secret exists. Bodies are capped at 1 MiB, timestamps more than 60 seconds old are rejected, uploads are limited to one per second, and stored data expires after 15 seconds. A map region uses receiver data only when its centre is within 250 km of the station; otherwise the community feed covers it better. Receiver and community aircraft are never mixed in one view.

I do not have a receiver yet. The bridge and the endpoint are tested against recorded readsb output, with authentication, size-limit, expiry and region checks, but the physical test is still outstanding. The setup guide in the repository says so.

## What I verified

The release has 132 automated tests covering domain logic, Worker contracts and the shared feed object. I ran browser walkthroughs locally and against production: overhead radar, watchlist alerts, coloured trails, replay from a chart point, Heathrow's runways drawn from threshold data, and an offline reload that opens the spotting log. On production I also checked that the receiver endpoint rejects unauthenticated uploads, that real route data now arrives with its frequency and date, and that profiles load under live polling.

What I most want to keep from this release is the habit behind it. Each time a feature could have shown a confident answer, the code shows the evidence and how strong it is instead.

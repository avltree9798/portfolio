---
title: 'Airtrace engineering 6: sunlight at altitude, and contrails'
date: '2026-11-23'
summary: 'Why an airliner can shine after sunset and for how long, worked out from the horizon dip angle, and when it leaves a contrail, from the Schmidt–Appleman criterion and the temperature the aircraft reports.'
tags: ['aviation', 'algorithms', 'engineering']
draft: false
---

Part 6 of [Airtrace engineering](/blog/airtrace-engineering/).

Two things you notice when you look up rather than at a screen. At dusk, after the sun has set, airliners overhead still glow gold, bright moving dots in a darkening sky. And some aircraft draw white lines across the sky while others at the same moment don't. Both are physics with numbers Airtrace already has.

## Still in sunshine after sunset

Airtrace already knows where the sun is: the night shading on the map comes from the **subsolar point**, the spot on Earth where the sun is directly overhead, worked out from a standard low-precision solar position formula. The sun's elevation anywhere else follows from the angle between that point and yours:

```ts
const cos =
  Math.sin(lat * rad) * Math.sin(sun.lat * rad) +
  Math.cos(lat * rad) *
    Math.cos(sun.lat * rad) *
    Math.cos((lon - sun.lon) * rad)
return 90 - Math.acos(cos) / rad
```

On the ground, the sun has set when its elevation drops below zero (a little less, because the atmosphere bends light over the horizon). Higher up, you can see further. From height _h_, the horizon is below the horizontal by the **dip angle**:

```ts
dip = acos(R / (R + h))
```

where _R_ is the Earth's radius. At 37,000 ft that's 3.4°. Add about half a degree for refraction and an airliner at cruise is still in direct sunshine until the sun is nearly 4° below the horizon at its position: roughly 15 to 20 minutes after sunset on the ground beneath it.

### When it’s visible from the ground

For someone on the ground to see it as a lit dot, three things must be true at once: the sun has set where they are, the aircraft is still in sunshine, and it's well above their horizon (I use at least 5°).

My first version required the observer's sun to be at least 4° below the horizon, dark enough for a lit plane to stand out. The tests failed, and working through them showed why: for an aircraft directly overhead at 37,000 ft, it goes into shadow at about 3.9° below, so the two conditions almost never overlapped. The real phenomenon is in the window between sunset and that moment, while the sky is darkening but the plane hasn't yet, so the observer condition became simply "the sun has set" (below −1°).

How long the glow lasts depends on which way the aircraft is flying. Airtrace steps forward a minute at a time, moving the aircraft along its track and the sun along its path, until the aircraft enters the shadow. Flying east, into the night, that comes much sooner than flying west, chasing the sunset. The aircraft card says, for example, "Still in sunshine at 37,000 ft, though the sun has set on the ground below. From there it’s a bright moving dot for about 9 more min." In What's overhead, planes you can see this way are marked **lit**.

## Will it leave a contrail?

A contrail forms when hot, humid engine exhaust mixes with cold air and the mixture becomes saturated, so water condenses and freezes. The **Schmidt–Appleman criterion** gives the warmest air temperature at which that can happen, for a given pressure. The key quantity is the slope of the mixing line between exhaust and ambient air:

```ts
const G = (EI * cp * pressure * 100) / (eps * Q * (1 - eta)) // Pa/K
```

with these values:

- **EI**, water emitted per kilogram of fuel burnt: 1.25 kg
- **cp**, the heat capacity of air: 1004 J/(kg·K)
- **eps**, the ratio of the molar masses of water and air: 0.622
- **Q**, the energy in a kilogram of kerosene: 43.2 MJ
- **eta**, the engine's overall propulsion efficiency: 0.35

The efficiency matters more than you'd expect. A more efficient engine turns more of the fuel's energy into thrust and less into heat in the exhaust, so the exhaust is cooler and contrails form in slightly warmer air: modern engines make more contrails, not fewer.

The threshold for saturated air comes from Schumann's 1996 fit:

```ts
const x = Math.log(G - 0.053)
return -46.46 + 9.43 * x + 0.72 * x * x // °C
```

At 250 hPa (about 34,000 ft) it gives −41 °C, in line with the usual rule of thumb of about −40 °C at cruise levels. Against the standard atmosphere, the threshold and the temperature cross at about 27,000 ft: above that, a typical day is cold enough.

![Line chart of altitude against temperature. The standard atmosphere cools from 15 °C at sea level to -56.5 °C at 36,000 ft; the Schmidt–Appleman threshold runs from about -25 °C at sea level to about -42 °C at 40,000 ft. They cross at about 27,000 ft](/images/airtrace/engineering/contrail-threshold.svg)

### The temperature outside

Some aircraft report the outside air temperature directly. Many don't, but they report their Mach number and true airspeed, and the ratio of those is the local speed of sound, which depends only on temperature:

```ts
const sound = (tas * 0.514444) / mach // m/s
return sound ** 2 / (1.4 * 287.05) - 273.15 // °C
```

(1.4 is the ratio of specific heats for air, and 287.05 J/(kg·K) its gas constant.) If neither is available, Airtrace falls back to the standard atmosphere and says so.

I got this wrong in the test, not the code: I'd written that Mach 0.80 at 459 knots is about −54 °C. It's −56.3 °C. The code was right and the test's arithmetic wasn't, which is worth checking before "fixing" a formula.

### Likely, possible or unlikely

The criterion above is for air that's already saturated. Drier air needs to be colder still, by up to several degrees, and whether a trail persists for hours depends on the air being supersaturated with respect to ice. Aircraft don't broadcast humidity. So rather than a yes or no, Airtrace gives an outlook: **likely** if the air is more than 8 °C below the threshold (cold enough even if fairly dry), **possible** if it's just below (needs humid air), and **unlikely** above it. It never claims a trail will persist.

## Continue the series

[Previous: Learning where receivers can hear](/blog/airtrace-engineering-05-coverage/) [Next: How far off the direct route?](/blog/airtrace-engineering-07-detours/).

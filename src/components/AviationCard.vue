<script setup lang="ts">
import { portfolio } from '../content/portfolio'
</script>
<template>
  <aside class="aviation-card" aria-labelledby="aviation-title">
    <div class="aviation-story">
      <p class="eyebrow">OFF DUTY · ABOVE THE CLOUDS</p>
      <h3 id="aviation-title">An avgeek at heart.</h3>
      <p>
        Planes, pixels and a soft spot for Japan. A few of my favourite things.
      </p>
      <div class="airline-favourites" aria-label="Favourite airlines">
        <span
          v-for="airline in portfolio.aviation.airlines"
          :key="airline.code"
          :class="`airline-${airline.code.toLowerCase()}`"
          ><b>{{ airline.code }}</b
          >{{ airline.name }}</span
        >
      </div>
    </div>
    <div class="aircraft-favourite">
      <span class="eyebrow">FAVOURITE AIRCRAFT</span
      ><strong
        >{{ portfolio.aviation.aircraftCode
        }}<span aria-hidden="true">✦</span></strong
      ><span>{{ portfolio.aviation.aircraft }}</span>
    </div>
  </aside>
</template>

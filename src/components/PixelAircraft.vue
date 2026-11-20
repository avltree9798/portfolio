<template>
  <div class="landscape flight-scene">
    <div class="scene-caption">
      <span>AFTER HOURS</span><span>A350-1000 · A35K</span>
    </div>
    <svg
      viewBox="0 0 640 480"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Original pixel-art A350-1000 flying above clouds under a red moon"
      shape-rendering="crispEdges"
    >
      <defs>
        <pattern
          id="flight-stars"
          width="104"
          height="84"
          patternUnits="userSpaceOnUse"
        >
          <path d="M21 19h3v3h-3zM79 61h2v2h-2z" fill="#8291ac" />
        </pattern>
        <pattern
          id="cabin-windows"
          width="12"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M2 1h4v5H2z" fill="#60728c" />
        </pattern>
      </defs>
      <path fill="#192134" d="M0 0h640v480H0z" />
      <path fill="url(#flight-stars)" d="M0 0h640v370H0z" />
      <path
        fill="#e58980"
        d="M448 62h64v8h16v16h8v64h-8v16h-16v8h-64v-8h-16v-16h-8V86h8V70h16z"
      />
      <path
        fill="#23314b"
        d="M0 316h48v-12h80v-12h64v12h64v20h64v-12h80v-16h64v16h64v12h64v-12h48v168H0z"
      />
      <path
        fill="#34415c"
        d="M0 376h48v-16h80v-16h64v16h64v16h80v-16h48v-16h96v16h64v16h96v104H0z"
      />
      <path
        fill="#46506a"
        d="M0 438h80v-14h64v-18h80v18h64v14h64v-14h80v-16h80v16h64v14h64v42H0z"
      />
      <path
        fill="#8a8194"
        opacity=".45"
        d="M40 386h64v2H40zM236 400h80v2h-80zM466 382h96v2h-96zM128 458h108v2H128zM392 448h76v2h-76z"
      />
      <g class="aircraft-pixels" transform="translate(80 28) scale(.8)">
        <!-- A long fuselage, swept wings and dark cockpit mask suggest the A35K. -->
        <path fill="#8999b0" d="M282 210l50-66h18l-28 72z" />
        <path fill="#aeb9c7" d="M100 220l-12-19h-8l8 32z" />
        <path
          fill="#e8e7e2"
          d="M86 220h352v-4h42v4h20v4h20v4h16v4h16v8h8v8h-12v8h-32v4H120v-4h-20v-8H88v-12h-8v-8h6z"
        />
        <path fill="#fcf5e7" d="M100 220h338v-4h42v4h20v4H102z" />
        <path fill="#243b60" d="M90 242h462v6h-10v8h-26v4H120v-4h-20v-8H90z" />
        <path fill="#c45b68" d="M102 238h428v4H102z" />
        <path fill="#263b5b" d="M100 220l-36-76H46l17 86z" />
        <path fill="#dd7178" d="M64 144l30 64H82l-25-64z" />
        <path fill="#f5e9dc" d="M56 166l21 24H65z" />
        <path fill="url(#cabin-windows)" d="M132 226h340v8H132z" />
        <path fill="#303d54" d="M488 220h12v4h20v4h16v5h-34v-5h-14z" />
        <path fill="#8294ad" d="M302 242l-88 85h20l109-73z" />
        <path fill="#cbd1d5" d="M310 238l-74 67-12 27h14l23-18 89-62z" />
        <path fill="#f4ece0" d="M310 238h20l-84 76-10 18h-12l12-27z" />
        <path fill="#b74f5d" d="M224 332h14l8-18h-10z" />
        <path fill="#c1cbd3" d="M346 252h38v5h10v18h-10v5h-38v-5h-7v-18h7z" />
        <path fill="#71849d" d="M347 270h40v5h-4v5h-36z" />
        <path fill="#23324a" d="M383 257h8v18h-8z" />
        <path fill="#c1cbd3" d="M273 211h26v4h6v12h-7v4h-25z" />
        <path fill="#263650" d="M298 216h6v10h-6z" />
        <path fill="#e7a69a" d="M337 241h6v3h-6z" />
      </g>
      <path fill="#c6d0da" opacity=".35" d="M24 231h30v2H24zM8 239h36v2H8z" />
      <path
        fill="#bfd1cb"
        d="M174 92h4v12h-4zM170 96h12v4h-12zM544 286h3v9h-3zM541 289h9v3h-9z"
      />
    </svg>
    <div class="scene-footer">
      <span class="pixel-spark">✦</span> Long-haul daydreams. A35K always.
    </div>
  </div>
</template>

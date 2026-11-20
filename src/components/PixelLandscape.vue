<template>
  <div class="landscape">
    <div class="scene-caption">
      <span>京都の夜</span><span>A little Kyoto. A little 8-bit.</span>
    </div>
    <svg
      viewBox="0 0 640 480"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Original pixel-art Japanese night scene with a torii gate, mountains and a coral moon"
      shape-rendering="crispEdges"
    >
      <defs>
        <pattern
          id="stars"
          width="110"
          height="90"
          patternUnits="userSpaceOnUse"
        >
          <path d="M20 18h3v3h-3zM74 57h2v2h-2z" fill="#9990ac" />
        </pattern>
        <pattern
          id="water"
          width="80"
          height="23"
          patternUnits="userSpaceOnUse"
        >
          <path d="M8 9h30v2H8zM53 19h17v2H53z" fill="#5d4b70" />
        </pattern>
      </defs>
      <path fill="#201e2e" d="M0 0h640v480H0z" />
      <path fill="url(#stars)" d="M0 0h640v330H0z" />
      <path
        fill="#f28c82"
        d="M416 65h64v8h16v16h8v64h-8v16h-16v8h-64v-8h-16v-16h-8V89h8V73h16z"
      />
      <path
        fill="#393247"
        d="M0 240h32v-24h32v-24h32v-24h32v24h32v24h32v24h48v24h48v-24h32v-32h32v-32h32v-32h32v-32h32v32h32v32h32v32h32v32h48v24h48v48H0z"
      />
      <path
        fill="#60506b"
        d="M352 176h32v-32h32v-32h32v32h32v32h32v32h-32v-16h-32v-16h-32v16h-32v16h-32z"
      />
      <path
        fill="#292735"
        d="M0 288h32v-32h32v-32h32v32h32v32h32v-16h32v-32h32v-32h32v32h32v32h32v16h64v-16h48v-32h48v32h32v16h48v-32h32v32h64v64H0z"
      />
      <path fill="#393044" d="M0 336h640v144H0z" />
      <path fill="url(#water)" d="M0 351h640v129H0z" />
      <path
        fill="#a76c75"
        opacity=".5"
        d="M405 365h85v3h-85zM425 389h56v3h-56zM399 415h90v3h-90zM433 439h35v3h-35z"
      />
      <path
        fill="#141921"
        d="M0 336h70v-12h100v12h62v12h100v16h-86v12H96v16H0zM492 336h148v144h-58v-64h-42v-32h-48z"
      />
      <g fill="#11161d">
        <path
          d="M53 136h10v218H53zM20 167h76v9H20zM32 142h52v9H32zM9 196h98v10H9zM0 225h118v12H0zM0 256h129v13H0z"
        />
        <path
          d="M584 150h12v215h-12zM565 175h48v11h-48zM550 206h77v11h-77zM536 239h104v13H536zM523 274h117v13H523zM508 307h132v14H508z"
        />
      </g>
      <g fill="#b65e65">
        <path
          d="M259 224h14v116h-14zM367 224h14v116h-14zM247 249h146v11H247zM237 215h166v13H237zM225 202h190v10H225z"
        />
        <path d="M225 198h15v8h-15zM400 198h15v8h-15z" />
      </g>
      <path
        fill="#ef9c88"
        d="M239 215h161v4H239zM249 249h142v3H249zM259 228h4v108h-4zM367 228h4v108h-4z"
      />
      <path fill="#20252c" d="M294 320h52v9h15v9h22v10H256v-10h23v-9h15z" />
      <path fill="#f4c38d" d="M202 285h8v16h-8zM429 290h8v16h-8z" />
      <path fill="#6f695e" d="M205 301h2v34h-2zM432 306h2v28h-2z" />
      <path
        fill="#95bfa6"
        d="M118 312h4v4h-4zM493 224h4v4h-4zM157 365h4v4h-4z"
      />
    </svg>
    <div class="scene-footer">
      <span class="pixel-spark">✦</span> A small escape from the terminal.
    </div>
  </div>
</template>

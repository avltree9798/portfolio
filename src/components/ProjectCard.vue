<script setup lang="ts">
import type { Project } from '../content/portfolio'
defineProps<{ project: Project }>()
defineEmits<{ inspect: [project: Project] }>()
</script>

<template>
  <article class="project-card" :data-project="project.id">
    <div class="project-art" :class="project.artwork" aria-hidden="true">
      <div v-if="project.artwork === 'terminal'" class="mini-terminal">
        <div class="terminal-top">
          <i></i><i></i><i></i><span>security-worker.ts</span>
        </div>
        <code
          ><span class="code-purple">export default</span> {<br />&nbsp;
          <span class="code-coral">async</span> respond(event) {<br />&nbsp;
          &nbsp; await
          <span class="code-green">investigate</span>(event)<br />&nbsp; &nbsp;
          return <span class="code-green">'handled'</span><br />&nbsp; }<br />}</code
        >
      </div>
      <div v-else-if="project.artwork === 'apple'" class="phone">
        <div class="phone-speaker"></div>
        <span class="lock-shape"></span
        ><span class="phone-label">SYSTEM INTEGRITY</span
        ><span class="phone-check">[ verified ]</span>
      </div>
      <div v-else-if="project.artwork === 'database'" class="schema-art">
        <div><strong>MODEL</strong><span>id · relationships</span></div>
        <span class="schema-connector">↓ async query ↓</span>
        <div>
          <strong>DATABASE</strong><span>SQLite · PostgreSQL · D1</span>
        </div>
      </div>
      <div
        v-else-if="
          project.artwork === 'handheld' || project.artwork === 'dual-screen'
        "
        class="console-art"
        :class="{ dual: project.artwork === 'dual-screen' }"
      >
        <div class="console-screen">
          <span>▟ ▙ ▟</span
          ><small>{{
            project.artwork === 'handheld' ? '160 × 144' : 'ARM9 + ARM7'
          }}</small>
        </div>
        <div class="console-controls">
          <b>✚</b
          ><span v-if="project.artwork === 'dual-screen'" class="touch-screen"
            >touch</span
          ><span>● ●</span>
        </div>
      </div>
      <div v-else class="radar-scope"><span></span><i></i><b></b><em></em></div>
    </div>
    <div class="project-body">
      <p class="eyebrow">
        {{ project.category
        }}<span v-if="project.status"> · {{ project.status }}</span>
      </p>
      <h3>{{ project.title }}</h3>
      <p>{{ project.subtitle }}</p>
      <div class="tags">
        <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      </div>
      <button class="text-button" @click="$emit('inspect', project)">
        Details <span aria-hidden="true">＋</span>
      </button>
    </div>
  </article>
</template>

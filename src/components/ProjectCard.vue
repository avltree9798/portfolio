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
      <div v-else class="radar-scope"><span></span><i></i><b></b><em></em></div>
      <span class="art-caption">{{
        project.artwork === 'terminal'
          ? 'AUTOMATE THE BORING. SECURE THE REST.'
          : project.artwork === 'apple'
            ? 'TRUST, BUT VERIFY.'
            : 'OBSERVE. UNDERSTAND. DEFEND.'
      }}</span>
    </div>
    <div class="project-body">
      <p class="eyebrow">{{ project.category }}</p>
      <h3>{{ project.title }}</h3>
      <p>{{ project.subtitle }}</p>
      <div class="tags">
        <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      </div>
      <button class="text-button" @click="$emit('inspect', project)">
        Explore project <span aria-hidden="true">＋</span>
      </button>
    </div>
  </article>
</template>

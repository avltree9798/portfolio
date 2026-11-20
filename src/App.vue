<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { portfolio, type Category, type Project } from './content/portfolio'
import PixelAircraft from './components/PixelAircraft.vue'
import AviationCard from './components/AviationCard.vue'
import ProjectCard from './components/ProjectCard.vue'
import WritingSection from './components/WritingSection.vue'
const menuOpen = ref(false)
const category = ref<Category>('All work')
const categories: Category[] = [
  'All work',
  'Security engineering',
  'Open source',
]
const projects = computed(() =>
  portfolio.projects.filter(
    (project) =>
      category.value === 'All work' || project.category === category.value,
  ),
)
const selected = ref<Project | null>(null)
const modal = ref<HTMLDialogElement | null>(null)
let previousFocus: HTMLElement | null = null
async function inspect(project: Project) {
  previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  selected.value = project
  await nextTick()
  modal.value?.showModal()
}
function closeProject() {
  modal.value?.close()
  selected.value = null
  previousFocus?.focus()
}
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="header shell">
    <a class="brand" href="#" aria-label="Anthony Viriya home"
      ><span class="brand-symbol" aria-hidden="true"><span>⌘</span></span
      ><span>avltree9798</span></a
    >
    <button
      class="menu-button"
      aria-controls="navigation"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
    >
      {{ menuOpen ? 'Close' : 'Menu' }}
    </button>
    <nav
      id="navigation"
      :class="{ expanded: menuOpen }"
      aria-label="Main navigation"
    >
      <a href="#work" @click="menuOpen = false">Work</a
      ><a href="/blog/" @click="menuOpen = false">Writing</a
      ><a href="#experience" @click="menuOpen = false">Experience</a
      ><a href="#about" @click="menuOpen = false">About</a
      ><a href="#contact" class="nav-contact" @click="menuOpen = false"
        >Let’s talk <span aria-hidden="true">✦</span></a
      >
    </nav>
  </header>
  <main id="main">
    <section class="hero shell" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow hero-intro">
          <span class="small-cross" aria-hidden="true">✳</span> SECURITY
          ENGINEER · LONDON, UK
        </p>
        <h1 id="hero-title">
          A curious mind.<br />A <span>defender’s</span><br />instinct.
        </h1>
        <p class="hero-description">
          Hey, I’m {{ portfolio.name }}.<br />I build things that keep people
          safe, from the<br class="desktop-break" />
          devices in their hands to the systems behind them.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#work"
            >Explore my work <span aria-hidden="true">＋</span></a
          ><a class="button secondary" href="/Anthony_Viriya_CV.pdf" download
            >Download CV <span aria-hidden="true">↓</span></a
          >
        </div>
        <div class="currently">
          <span class="cloud-icon" aria-hidden="true">☁</span
          ><span
            >Currently engineering security at <strong>Cloudflare</strong></span
          >
        </div>
      </div>
      <PixelAircraft />
      <div class="hero-bottom">
        <span>SECURITY IN THE DAY. SIDE QUESTS AFTER DARK.</span
        ><a href="#work">Keep exploring <span aria-hidden="true">↓</span></a>
      </div>
    </section>
    <div class="specialities">
      <div class="shell">
        <span>Apple platform security</span><b aria-hidden="true">✦</b
        ><span>Security automation</span><b aria-hidden="true">✦</b
        ><span>Cloud infrastructure</span><b aria-hidden="true">✦</b
        ><span>Offensive thinking. Defensive building.</span>
      </div>
    </div>
    <section id="work" class="section shell" aria-labelledby="work-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">A FEW THINGS I’VE BUILT</p>
          <h2 id="work-title">Work with a purpose<span>.</span></h2>
        </div>
        <a
          class="quiet-link"
          :href="portfolio.github"
          target="_blank"
          rel="noopener noreferrer"
          >Find me on GitHub <span aria-hidden="true">⌘</span></a
        >
      </div>
      <div class="filters" aria-label="Filter projects">
        <button
          v-for="item in categories"
          :key="item"
          :aria-pressed="category === item"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
      <div class="project-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @inspect="inspect"
        />
      </div>
      <p class="results" aria-live="polite">
        {{ projects.length }} projects · Selected work, from enterprise systems
        to open source.
      </p>
    </section>
    <section
      id="experience"
      class="section shell experience"
      aria-labelledby="experience-title"
    >
      <div class="experience-intro">
        <p class="eyebrow">THE JOURNEY SO FAR</p>
        <h2 id="experience-title">
          Always learning.<br />Always building<span>.</span>
        </h2>
        <p>
          From finding vulnerabilities to building the systems that prevent
          them.
        </p>
        <a href="/Anthony_Viriya_CV.pdf" download class="quiet-link"
          >The full story in my CV <span aria-hidden="true">↓</span></a
        >
      </div>
      <div class="timeline">
        <article v-for="job in portfolio.experience" :key="job.company">
          <span class="company-mark" :class="job.accent" aria-hidden="true">{{
            job.company.slice(0, 1)
          }}</span>
          <div>
            <div class="job-heading">
              <h3>{{ job.company }}</h3>
              <span>{{ job.period }}</span>
            </div>
            <h4>{{ job.role }}</h4>
            <p>{{ job.summary }}</p>
          </div>
        </article>
      </div>
    </section>
    <section
      id="about"
      class="section shell about"
      aria-labelledby="about-title"
    >
      <div class="about-panel">
        <p class="eyebrow">THE HUMAN BEHIND THE TERMINAL</p>
        <h2 id="about-title">
          Security is my craft.<br />Curiosity is my compass<span>.</span>
        </h2>
        <p>
          I’m a London-based security engineer who enjoys understanding how
          things work, and what happens when they don’t. My work brings together
          Apple platform security, offensive research and thoughtful automation.
        </p>
        <p>
          Away from the terminal, I’m an avgeek with a soft spot for Japan,
          Nintendo games and the Airbus A350-1000. British Airways and Japan
          Airlines are my favourites. That same curiosity finds its way back
          into everything I build.
        </p>
        <div class="interest-tags">
          <span>日本 · Japan</span><span>✚ Nintendo</span><span>✈ Avgeek</span>
        </div>
      </div>
      <div class="toolkit">
        <p class="eyebrow">IN MY TOOLKIT</p>
        <div class="tags skill-tags">
          <span v-for="skill in portfolio.skills" :key="skill">{{
            skill
          }}</span>
        </div>
        <p class="eyebrow certification-label">CERTIFICATIONS</p>
        <ul>
          <li
            v-for="certification in portfolio.certifications"
            :key="certification"
          >
            <span aria-hidden="true">✧</span>{{ certification }}
          </li>
        </ul>
      </div>
    </section>
    <AviationCard />
    <WritingSection />
    <section id="contact" class="contact shell" aria-labelledby="contact-title">
      <p class="eyebrow">GOOD THINGS START WITH A CONVERSATION</p>
      <h2 id="contact-title">
        Have a curious problem<span>?</span><br />Let’s figure it out.
      </h2>
      <a class="button primary" :href="`mailto:${portfolio.email}`"
        >Say hello <span aria-hidden="true">✦</span></a
      >
      <p>{{ portfolio.email }}</p>
    </section>
  </main>
  <footer class="shell footer">
    <a class="brand" href="#"
      ><span class="brand-symbol" aria-hidden="true"><span>⌘</span></span
      ><span>{{ portfolio.name }}</span></a
    ><span>Made with care. And a little pixel magic.</span>
    <div>
      <a :href="portfolio.github" target="_blank" rel="noopener noreferrer"
        >GitHub</a
      ><a :href="portfolio.linkedin" target="_blank" rel="noopener noreferrer"
        >LinkedIn</a
      ><a href="#main">Back to top ↑</a>
    </div>
  </footer>
  <dialog
    ref="modal"
    aria-labelledby="project-title"
    @cancel.prevent="closeProject"
    @click="$event.target === modal && closeProject()"
  >
    <div v-if="selected" class="dialog-body">
      <button
        class="dialog-close"
        aria-label="Close project"
        @click="closeProject"
      >
        ×
      </button>
      <p class="eyebrow">{{ selected.context }}</p>
      <h2 id="project-title">{{ selected.title }}</h2>
      <p>{{ selected.detail }}</p>
      <div class="project-notes">
        <h3>{{ selected.outcomeTitle }}</h3>
        <p>{{ selected.outcome }}</p>
      </div>
      <div class="tags">
        <span v-for="tag in selected.tags" :key="tag">{{ tag }}</span>
      </div>
      <a
        v-if="selected.url"
        class="button primary"
        :href="selected.url"
        target="_blank"
        rel="noopener noreferrer"
        >View source</a
      >
    </div>
  </dialog>
</template>

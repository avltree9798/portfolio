<script setup lang="ts">
import posts from '../content/posts.generated.json'
interface PostSummary {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  minutes: number
}
const entries: PostSummary[] = posts
</script>
<template>
  <section
    id="writing"
    class="section shell writing"
    aria-labelledby="writing-title"
  >
    <div class="section-heading">
      <div>
        <p class="eyebrow">THINKING OUT LOUD</p>
        <h2 id="writing-title">Field notes<span>.</span></h2>
      </div>
      <a class="quiet-link" href="/blog/">Read the notebook</a>
    </div>
    <div v-if="entries.length" class="post-list">
      <a
        v-for="post in entries.slice(0, 3)"
        :key="post.slug"
        class="post-row"
        :href="`/blog/${post.slug}/`"
        ><time :datetime="post.date">{{ post.date }}</time>
        <div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.summary }}</p>
        </div>
        <span>{{ post.minutes }} min read</span></a
      >
    </div>
    <div v-else class="notebook-empty">
      <span aria-hidden="true">✳</span>
      <h3>The notebook is open.</h3>
      <p>
        Field notes on security, engineering and the occasional side quest.<br />New
        entries will appear here.
      </p>
    </div>
  </section>
</template>

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePost, publicPosts, renderArticle } from './lib/blog.mjs'
const source = `---
title: A security field note
date: 2026-11-20
summary: A short summary.
tags: [security, engineering]
draft: false
---
## A useful heading

Some **Markdown** and [a link](https://example.com).

<script>alert(1)</script>

[bad](javascript:alert(1))
`

test('reads Markdown metadata and renders safe formatted content', () => {
  const post = parsePost(source, 'a-field-note')
  assert.equal(post.title, 'A security field note')
  assert.match(post.html, /<strong>Markdown<\/strong>/)
  assert.ok(!post.html.includes('<script>'))
  assert.ok(!post.html.includes('href="javascript:'))
})
test('excludes drafts and sorts published posts newest first', () => {
  const post = parsePost(source, 'first')
  assert.deepEqual(
    publicPosts([
      { ...post, slug: 'draft', draft: true },
      post,
      { ...post, slug: 'latest', date: '2026-11-21' },
    ]).map((p) => p.slug),
    ['latest', 'first'],
  )
})
test('rejects invalid metadata rather than silently publishing it', () => {
  assert.throws(
    () => parsePost(source.replace('draft: false', 'draft: perhaps'), 'bad'),
    /draft/,
  )
  assert.throws(
    () => parsePost(source.replace('2026-11-20', '2026-02-31'), 'bad'),
    /date/,
  )
  assert.throws(() => parsePost(source, '../secret'), /slug/)
})
test('creates a shareable article with canonical metadata and no third-party scripts', () => {
  const html = renderArticle(
    parsePost(source, 'a-field-note'),
    '<link rel="stylesheet" href="/assets/site.css">',
  )
  assert.ok(html.includes('https://avltree9798.co.uk/blog/a-field-note/'))
  assert.ok(html.includes('<h1>A security field note</h1>'))
  assert.ok(!html.includes('<script'))
})

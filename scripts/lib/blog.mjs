import MarkdownIt from 'markdown-it'
import { parse } from 'yaml'
import { readdir, readFile } from 'node:fs/promises'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
export const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
export function parsePost(source, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error('Invalid post slug')
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error(`${slug}: YAML front matter is required`)
  const data = parse(match[1])
  for (const key of ['title', 'date', 'summary'])
    if (typeof data?.[key] !== 'string' || !data[key].trim())
      throw new Error(`${slug}: ${key} is required`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    Number.isNaN(Date.parse(data.date)) ||
    new Date(data.date).toISOString().slice(0, 10) !== data.date
  )
    throw new Error(`${slug}: date must be a valid YYYY-MM-DD date`)
  if (typeof data.draft !== 'boolean')
    throw new Error(`${slug}: draft must be true or false`)
  if (
    !Array.isArray(data.tags) ||
    !data.tags.every((tag) => typeof tag === 'string')
  )
    throw new Error(`${slug}: tags must be a list of strings`)
  const body = source.slice(match[0].length)
  return {
    slug,
    title: data.title,
    date: data.date,
    summary: data.summary,
    tags: data.tags,
    draft: data.draft,
    body,
    html: markdown.render(body),
    minutes: Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200)),
  }
}
export const publicPosts = (posts) =>
  posts
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
export async function loadPosts() {
  // lib/ is inside scripts/, so the content directory is at the repository root.
  const rootFolder = new URL('../../content/posts/', import.meta.url)
  const names = (await readdir(rootFolder)).filter((name) =>
    name.endsWith('.md'),
  )
  return publicPosts(
    await Promise.all(
      names.map(async (name) =>
        parsePost(
          await readFile(new URL(name, rootFolder), 'utf8'),
          name.slice(0, -3),
        ),
      ),
    ),
  )
}
const navigation =
  '<header class="shell blog-header"><a class="brand" href="/"><span class="brand-symbol">⌘</span>avltree9798</a><nav aria-label="Blog navigation"><a href="/blog/">Writing</a><a href="/">Portfolio</a></nav></header>'
const footer =
  '<footer class="shell footer"><span>Anthony Viriya · Field notes</span><a href="mailto:me@avltree9798.co.uk">Say hello</a></footer>'
function documentHtml(title, description, url, css, content) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#15151c"><title>${escapeHtml(title)} · Anthony Viriya</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(url)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(url)}"><link rel="icon" href="/favicon.svg">${css}</head><body><a class="skip-link" href="#main">Skip to content</a>${navigation}${content}${footer}</body></html>`
}
export function renderArticle(post, css) {
  const tags = post.tags
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join('')
  return documentHtml(
    post.title,
    post.summary,
    `https://avltree9798.co.uk/blog/${post.slug}/`,
    css,
    `<main id="main" class="shell article-shell"><article><a class="quiet-link" href="/blog/">All field notes</a><p class="eyebrow article-date"><time datetime="${post.date}">${post.date}</time> · ${post.minutes} min read</p><h1>${escapeHtml(post.title)}</h1><p class="article-summary">${escapeHtml(post.summary)}</p><div class="tags">${tags}</div><div class="prose">${post.html}</div></article></main>`,
  )
}
export function renderIndex(posts, css) {
  const list = posts.length
    ? `<div class="post-list">${posts.map((post) => `<a class="post-row" href="/blog/${post.slug}/"><time datetime="${post.date}">${post.date}</time><div><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.summary)}</p></div><span>${post.minutes} min read</span></a>`).join('')}</div>`
    : '<div class="notebook-empty"><span aria-hidden="true">✳</span><h2>The notebook is open.</h2><p>Field notes on security, engineering and the occasional side quest.<br>New entries will appear here.</p></div>'
  return documentHtml(
    'Field notes',
    'Writing on security, engineering and the occasional side quest.',
    'https://avltree9798.co.uk/blog/',
    css,
    `<main id="main" class="shell article-shell"><p class="eyebrow">THINKING OUT LOUD</p><h1>Field notes<span>.</span></h1><p class="article-summary">Things learned. Questions explored. Ideas worth keeping.</p>${list}</main>`,
  )
}

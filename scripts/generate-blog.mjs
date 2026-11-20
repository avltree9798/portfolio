import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  loadPosts,
  renderArticle,
  renderIndex,
  escapeHtml,
} from './lib/blog.mjs'
const posts = await loadPosts()
const metadata = posts.map(({ slug, title, date, summary, tags, minutes }) => ({
  slug,
  title,
  date,
  summary,
  tags,
  minutes,
}))
await writeFile(
  new URL('../src/content/posts.generated.json', import.meta.url),
  JSON.stringify(metadata, null, 2) + '\n',
)
if (process.argv.includes('--pages')) {
  const dist = new URL('../dist/', import.meta.url)
  const index = await readFile(new URL('index.html', dist), 'utf8')
  const css = (index.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || []).join('')
  if (!css) throw new Error('No production stylesheet found for blog pages')
  await mkdir(new URL('blog/', dist), { recursive: true })
  await writeFile(new URL('blog/index.html', dist), renderIndex(posts, css))
  for (const post of posts) {
    const folder = new URL(`blog/${post.slug}/`, dist)
    await mkdir(folder, { recursive: true })
    await writeFile(new URL('index.html', folder), renderArticle(post, css))
  }
  await writeFile(
    new URL('sitemap.xml', dist),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/blog/', ...posts.map((post) => `/blog/${post.slug}/`)].map((path) => `<url><loc>${escapeHtml('https://avltree9798.co.uk' + path)}</loc></url>`).join('')}</urlset>`,
  )
  await writeFile(
    new URL('robots.txt', dist),
    'User-agent: *\nAllow: /\nSitemap: https://avltree9798.co.uk/sitemap.xml\n',
  )
}
console.log(
  `Prepared ${posts.length} published Markdown posts; drafts excluded.`,
)

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { loadPosts, renderArticle, renderIndex } from './scripts/lib/blog.mjs'
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'markdown-blog-preview',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const path = request.url?.split('?')[0]
          if (!path?.startsWith('/blog')) return next()
          const posts = await loadPosts()
          const css = '<link rel="stylesheet" href="/src/style.css?direct">'
          if (path === '/blog' || path === '/blog/') {
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            return response.end(renderIndex(posts, css))
          }
          const post = posts.find(
            (item) =>
              path === `/blog/${item.slug}/` || path === `/blog/${item.slug}`,
          )
          if (!post) {
            response.statusCode = 404
            return response.end('Post not found')
          }
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(renderArticle(post, css))
        })
      },
    },
  ],
  test: { environment: 'happy-dom', include: ['src/**/*.test.ts'] },
})

export interface Post {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  draft: boolean
  body: string
  html: string
  minutes: number
}
export function parsePost(source: string, slug: string): Post
export function publicPosts(posts: Post[]): Post[]
export function loadPosts(): Promise<Post[]>
export function renderArticle(post: Post, css: string): string
export function renderIndex(posts: Post[], css: string): string
export function escapeHtml(value: string): string

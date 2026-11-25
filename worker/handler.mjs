import { issue, valid, passwordMatches } from './auth.mjs'
const cookieName = '__Host-cv_admin'
const cookie = (value, age) =>
  `${cookieName}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
}
const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { ...privateHeaders, ...headers } })
export function createHandler(pdf) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      const path = url.pathname
      if (path === '/Anthony_Viriya_CV.pdf')
        return new Response('Not found', {
          status: 404,
          headers: privateHeaders,
        })
      if (path === '/cv/download') {
        if (!['GET', 'HEAD'].includes(request.method))
          return json({ error: 'Method not allowed' }, 405)
        if (
          !(await valid(
            env.CV_LINK_KEY,
            url.searchParams.get('token'),
            'download',
          ))
        )
          return json({ error: 'This link is invalid or has expired.' }, 403)
        return new Response(request.method === 'HEAD' ? null : pdf, {
          headers: {
            ...privateHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition':
              'attachment; filename="Anthony_Viriya_CV.pdf"',
          },
        })
      }
      if (!path.startsWith('/api/cv/')) return env.ASSETS.fetch(request)
      if (!env.CV_LINK_KEY || !env.CV_ADMIN_HASH)
        return json({ error: 'CV access is not configured.' }, 503)
      const session = request.headers
        .get('Cookie')
        ?.split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(cookieName + '='))
        ?.slice(cookieName.length + 1)
      const signedIn = await valid(env.CV_LINK_KEY, session, 'session')
      if (path === '/api/cv/session' && request.method === 'GET')
        return json({ signedIn })
      if (request.method !== 'POST')
        return json({ error: 'Method not allowed' }, 405)
      if (
        request.headers.get('Origin') !== url.origin ||
        !request.headers.get('Content-Type')?.startsWith('application/json')
      )
        return json({ error: 'Request rejected.' }, 403)
      if (Number(request.headers.get('Content-Length')) > 2048)
        return json({ error: 'Request too large.' }, 413)
      let data
      try {
        // Read at most 2 KiB even when Content-Length is absent or forged.
        const reader = request.body?.getReader()
        const chunks = []
        let size = 0
        if (reader)
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > 2048) {
              await reader.cancel()
              return json({ error: 'Request too large.' }, 413)
            }
            chunks.push(value)
          }
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
        data = JSON.parse(new TextDecoder().decode(bytes))
        if (!data || typeof data !== 'object' || Array.isArray(data))
          throw Error()
      } catch {
        return json({ error: 'Invalid request.' }, 400)
      }
      if (path === '/api/cv/login') {
        if (
          env.CV_LOGIN_LIMITER &&
          !(
            await env.CV_LOGIN_LIMITER.limit({
              key: request.headers.get('CF-Connecting-IP') || 'unknown',
            })
          ).success
        )
          return json(
            { error: 'Too many attempts. Try again in a minute.' },
            429,
          )
        if (!(await passwordMatches(data.password, env.CV_ADMIN_HASH)))
          return json({ error: 'Incorrect password.' }, 401)
        return json({ signedIn: true }, 200, {
          'Set-Cookie': cookie(
            await issue(env.CV_LINK_KEY, 'session', 900),
            900,
          ),
        })
      }
      if (path === '/api/cv/logout')
        return json({ signedIn: false }, 200, { 'Set-Cookie': cookie('', 0) })
      if (!signedIn) return json({ error: 'Sign in to generate a link.' }, 401)
      if (path === '/api/cv/link') {
        if (![3600, 86400, 604800].includes(data.seconds))
          return json({ error: 'Choose a valid expiry.' }, 400)
        const token = await issue(env.CV_LINK_KEY, 'download', data.seconds)
        return json({
          url: `https://avltree9798.co.uk/cv/download?token=${token}`,
          expiresAt: new Date(Date.now() + data.seconds * 1000).toISOString(),
        })
      }
      return json({ error: 'Not found' }, 404)
    },
  }
}

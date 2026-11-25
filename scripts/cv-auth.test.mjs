import { test } from 'node:test'
import assert from 'node:assert/strict'
import { issue, valid, passwordMatches } from '../worker/auth.mjs'
import { createHash } from 'node:crypto'
test('CV tokens reject tampering, expiry, wrong keys and exchanged purposes', async () => {
  const token = await issue('test-secret', 'download', 60, 100000)
  assert.equal(await valid('test-secret', token, 'download', 100000), true)
  for (const [secret, value, purpose, now] of [
    ['wrong', token, 'download', 100000],
    ['test-secret', token, 'session', 100000],
    ['test-secret', token, 'download', 160000],
    ['test-secret', token + 'x', 'download', 100000],
    ['test-secret', 'malformed', 'download', 100000],
  ])
    assert.equal(await valid(secret, value, purpose, now), false)
})
test('only the owner password matches its stored digest', async () => {
  const hash = createHash('sha256').update('owner-password').digest('hex')
  assert.equal(await passwordMatches('owner-password', hash), true)
  assert.equal(await passwordMatches('wrong-password', hash), false)
  assert.equal(await passwordMatches({}, hash), false)
})

import { createHandler } from '../worker/handler.mjs'
test('only an authenticated owner can generate links and only signed links download', async () => {
  const pdf = new TextEncoder().encode('%PDF-test')
  const app = createHandler(pdf)
  const env = {
    CV_LINK_KEY: 'test-secret',
    CV_ADMIN_HASH: createHash('sha256').update('owner-password').digest('hex'),
    ASSETS: { fetch: () => new Response('not found', { status: 404 }) },
  }
  const post = (path, data, cookie = '', origin = 'https://example.com') =>
    new Request('https://example.com/api/cv/' + path, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(data),
    })
  assert.equal(
    (await app.fetch(post('link', { seconds: 3600 }), env)).status,
    401,
  )
  assert.equal(
    (
      await app.fetch(
        post(
          'login',
          { password: 'owner-password' },
          '',
          'https://attacker.example',
        ),
        env,
      )
    ).status,
    403,
  )
  assert.equal(
    (await app.fetch(post('login', { password: 'wrong' }), env)).status,
    401,
  )
  const login = await app.fetch(
    post('login', { password: 'owner-password' }),
    env,
  )
  const cookie = login.headers.get('Set-Cookie')
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/'])
    assert.ok(cookie.includes(flag))
  assert.equal(
    (await app.fetch(post('link', { seconds: 99999999 }, cookie), env)).status,
    400,
  )
  const link = await (
    await app.fetch(post('link', { seconds: 3600 }, cookie), env)
  ).json()
  const download = await app.fetch(new Request(link.url), env)
  assert.equal(await download.text(), '%PDF-test')
  assert.equal(download.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(
    (await app.fetch(new Request('https://example.com/cv/download'), env))
      .status,
    403,
  )
  assert.equal(
    (
      await app.fetch(
        new Request('https://example.com/Anthony_Viriya_CV.pdf'),
        env,
      )
    ).status,
    404,
  )
  const session = await issue(env.CV_LINK_KEY, 'session', 900)
  assert.equal(
    (
      await app.fetch(
        new Request('https://example.com/cv/download?token=' + session),
        env,
      )
    ).status,
    403,
  )
  const limited = {
    ...env,
    CV_LOGIN_LIMITER: { limit: async () => ({ success: false }) },
  }
  assert.equal(
    (await app.fetch(post('login', { password: 'owner-password' }), limited))
      .status,
    429,
  )
})

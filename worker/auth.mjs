const encoder = new TextEncoder()
const encode = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
const decode = (value) =>
  Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
    c.charCodeAt(0),
  )
const key = (secret) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
export async function issue(secret, purpose, seconds, now = Date.now()) {
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        purpose,
        exp: Math.floor(now / 1000) + seconds,
        nonce: crypto.randomUUID(),
      }),
    ),
  )
  return `${payload}.${encode(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload))))}`
}
export async function valid(secret, token, purpose, now = Date.now()) {
  try {
    if (!secret || !token || token.length > 2048) return false
    const [payload, signature, extra] = token.split('.')
    if (extra !== undefined || !payload || !signature) return false
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await key(secret),
        decode(signature),
        encoder.encode(payload),
      ))
    )
      return false
    const data = JSON.parse(new TextDecoder().decode(decode(payload)))
    return (
      data.purpose === purpose &&
      Number.isSafeInteger(data.exp) &&
      data.exp > Math.floor(now / 1000)
    )
  } catch {
    return false
  }
}
export async function passwordMatches(password, expected) {
  if (typeof password !== 'string' || password.length > 256 || !expected)
    return false
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(password)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('')
  // HMAC verification compares the digests without a timing-sensitive string comparison.
  const comparisonKey = await key('cv-admin-digest-comparison')
  const signature = await crypto.subtle.sign(
    'HMAC',
    comparisonKey,
    encoder.encode(expected),
  )
  return crypto.subtle.verify(
    'HMAC',
    comparisonKey,
    signature,
    encoder.encode(digest),
  )
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { renderCvHtml, generateCv } from './generate-cv.mjs'
const cv = JSON.parse(
  await readFile(new URL('../src/content/cv.json', import.meta.url), 'utf8'),
)

test('keeps the supplied CV’s three-page section arrangement', () => {
  const html = renderCvHtml(cv)
  assert.equal((html.match(/class="page"/g) || []).length, 3)
  for (const title of [
    'Certifications',
    'Experiences',
    'Projects',
    'Publications',
    'Skills',
    'Education',
  ])
    assert.ok(html.includes(title))
  for (const job of cv.experience)
    for (const bullet of job.bullets)
      assert.ok(html.includes(bullet.replaceAll('&', '&amp;')))
})

test('reflects edited content and escapes markup', () => {
  const html = renderCvHtml({
    ...cv,
    name: 'Updated <script>alert(1)</script>',
    updated: 'November 2026',
  })
  assert.ok(html.includes('Updated &lt;script&gt;'))
  assert.ok(html.includes('November 2026'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!/\bPRIVATE_PROJECT_MARKER\b/i.test(renderCvHtml(cv)))
})

test('generates a real three-page PDF and rejects overflowing pages', async () => {
  const pdf = await generateCv(cv)
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.equal(
    (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length,
    3,
  )
  const oversized = {
    ...cv,
    experience: cv.experience.map((job, index) =>
      index === 0
        ? {
            ...job,
            bullets: Array(100).fill(
              'A long entry which must never be silently clipped from the generated CV.',
            ),
          }
        : job,
    ),
  }
  await assert.rejects(() => generateCv(oversized), /overflows/)
})

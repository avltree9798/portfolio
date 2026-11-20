import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
const bullets = (items) =>
  `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
const heading = (title) => `<h2><span>${title}</span></h2>`
const footer = (name, number) =>
  `<footer>${escape(name)} – ${number}/3</footer>`
const job = (entry) =>
  `<article class="job"><div><strong>${escape(entry.company)}</strong>, ${escape(entry.role)}${bullets(entry.bullets)}</div><aside>${escape(entry.location)}<br>${escape(entry.period)}</aside></article>`
const project = (entry) =>
  `<article class="project"><h3>${escape(entry.name)}</h3><p>${escape(entry.description)}</p>${bullets(entry.bullets)}</article>`
const icon = (path) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`
const icons = {
  location: icon(
    'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
  ),
  email: icon('M2 4h20v16H2zm2 2v1l8 6 8-6V6l-8 6z'),
  phone: icon(
    'M5 2h4l2 6-3 2c1 3 3 5 6 6l2-3 6 2v4c0 2-2 3-4 3C9 21 3 15 2 6c0-2 1-4 3-4z',
  ),
  web: icon(
    'M10 6H7a6 6 0 0 0 0 12h5v-3H7a3 3 0 0 1 0-6h3zm4 3h3a3 3 0 0 1 0 6h-3v3h3a6 6 0 0 0 0-12h-3zM8 11h8v2H8z',
  ),
}

export function renderCvHtml(cv, fonts = {}) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${escape(cv.name)} – CV</title><style>
  @font-face {font-family:SourceSans;src:url(data:font/ttf;base64,${fonts.regular || ''});font-weight:100 900;font-style:normal}
  @font-face {font-family:SourceSans;src:url(data:font/ttf;base64,${fonts.italic || ''});font-weight:100 900;font-style:italic}
  @page {size:letter;margin:0} *{box-sizing:border-box} html,body{margin:0;padding:0} body{font-family:SourceSans,sans-serif;font-size:10pt;line-height:1.25;color:#111}
  .page{width:612pt;height:792pt;padding:47pt 50.5pt 46pt;position:relative;break-after:page}.page:last-child{break-after:auto}.page-content{height:100%}
  h1,h2,h3,p,ul{margin:0} strong{font-weight:700} a{color:#004f90;text-decoration:none} header{position:relative;text-align:center;color:#004f90;margin-bottom:12pt}
  .updated{position:absolute;right:5pt;top:-25pt;color:#808080;font-size:9pt;font-style:italic}h1{font-size:30pt;line-height:1.1;font-weight:700;letter-spacing:-.2pt}.role{margin-top:10pt;margin-bottom:16pt}
  .contacts{display:flex;justify-content:center;gap:14pt;flex-wrap:wrap;font-size:10pt;line-height:1.25}.contacts a,.contacts span{display:inline-flex;align-items:center;gap:3pt}.contacts svg{height:9pt;width:9pt;fill:currentColor;flex:none}.socials{margin-top:6pt;display:flex;justify-content:center;gap:14pt;font-size:10pt}.social-symbol{font-weight:700;font-size:9pt}
  h2{font-size:14pt;line-height:1.2;color:#004f90;display:flex;align-items:baseline;gap:3pt;margin:8pt 0 5pt;font-weight:700}h2:after{content:'';flex:1;border-top:.5pt solid #4d8fc6;transform:translateY(-1pt)}
  ul{padding-left:12pt}li{padding-left:0;margin:0;line-height:1.25}li::marker{font-size:7pt}.certifications{margin-left:5pt;line-height:1.5}.certifications li{line-height:1.5}
  .job{display:grid;grid-template-columns:minmax(0,1fr) 108pt;gap:14pt;margin-left:5pt;margin-right:5pt;margin-bottom:12pt}.job aside{text-align:right}.job:last-child{margin-bottom:0}.job ul{margin-top:0}
  .project{margin-left:5pt;margin-right:5pt;margin-bottom:8pt}h3{font-size:10pt;line-height:1.25;color:#004f90;font-weight:700}.publication{margin-left:5pt;margin-right:5pt}.publication-title{display:flex;justify-content:space-between;gap:10pt}.publication em{display:block}
  .skills p{margin-left:5pt;margin-right:5pt;margin-bottom:4pt}.education{display:grid;grid-template-columns:28pt 1fr 108pt;gap:4pt;margin-left:5pt;margin-right:5pt}.education aside{text-align:right}.education ul{padding-left:12pt}
  footer{position:absolute;bottom:22pt;left:50.5pt;right:50.5pt;text-align:center;font-size:9pt;color:#808080;font-style:italic}
  </style></head><body>
  <section class="page"><div class="page-content"><header><div class="updated">Last updated in ${escape(cv.updated)}</div><h1>${escape(cv.name)}</h1><p class="role">${escape(cv.role)}</p><div class="contacts"><span>${icons.location}${escape(cv.location)}</span><a href="mailto:${escape(cv.email)}">${icons.email}${escape(cv.email)}</a><a href="tel:${escape(cv.phone.replaceAll(' ', ''))}">${icons.phone}${escape(cv.phone)}</a><a href="https://${escape(cv.website)}">${icons.web}${escape(cv.website)}</a></div><div class="socials"><a href="https://www.linkedin.com/in/${escape(cv.linkedin)}/"><span class="social-symbol">▣</span> ${escape(cv.linkedin)}</a><a href="https://github.com/${escape(cv.github)}"><span class="social-symbol">●</span> ${escape(cv.github)}</a></div></header>
  ${heading('Certifications')}<ul class="certifications">${cv.certifications.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>${heading('Experiences')}${job(cv.experience[0])}</div>${footer(cv.name, 1)}</section>
  <section class="page"><div class="page-content">${cv.experience.slice(1).map(job).join('')}${heading('Projects')}${project(cv.projects[0])}</div>${footer(cv.name, 2)}</section>
  <section class="page"><div class="page-content">${cv.projects.slice(1).map(project).join('')}${heading('Publications')}<div class="publication"><div class="publication-title"><strong>${escape(cv.publication.title)}</strong><span>${escape(cv.publication.year)}</span></div><p>${escape(cv.publication.subtitle)}</p><em>${escape(cv.publication.author)}</em><a href="${escape(cv.publication.url)}">${escape(cv.publication.label)}</a></div>
  ${heading('Skills')}<div class="skills">${Object.entries(cv.skills)
    .map(
      ([category, value]) =>
        `<p><strong>${escape(category)}:</strong> ${escape(value)}</p>`,
    )
    .join(
      '',
    )}</div>${heading('Education')}<div class="education"><strong>${escape(cv.education.degree)}</strong><div><strong>${escape(cv.education.university)}</strong>, ${escape(cv.education.subject)}${bullets(cv.education.bullets)}</div><aside>${escape(cv.education.location)}<br>${escape(cv.education.period)}</aside></div></div>${footer(cv.name, 3)}</section>
  </body></html>`
}

export async function generateCv(cv) {
  const [regular, italic] = await Promise.all(
    ['SourceSans3.ttf', 'SourceSans3-Italic.ttf'].map((name) =>
      readFile(new URL(`./cv/fonts/${name}`, import.meta.url)),
    ),
  )
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ javaScriptEnabled: false })
    await page.setContent(
      renderCvHtml(cv, {
        regular: regular.toString('base64'),
        italic: italic.toString('base64'),
      }),
      { waitUntil: 'load' },
    )
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page
      .locator('.page-content')
      .evaluateAll((pages) =>
        pages
          .map((page, index) =>
            page.scrollHeight > page.clientHeight + 1 ? index + 1 : null,
          )
          .filter(Boolean),
      )
    if (overflow.length)
      throw new Error(
        `CV content overflows page(s) ${overflow.join(', ')}. Edit the content or template before publishing.`,
      )
    return await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    })
  } finally {
    await browser.close()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const cv = JSON.parse(
    await readFile(new URL('../src/content/cv.json', import.meta.url), 'utf8'),
  )
  const pdf = await generateCv(cv)
  const output = new URL('../public/Anthony_Viriya_CV.pdf', import.meta.url)
  await mkdir(new URL('../public/', import.meta.url), { recursive: true })
  await writeFile(output, pdf)
  console.log(`Generated CV from repository content: ${pdf.length} bytes`)
}

import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import App from './App.vue'
import { portfolio } from './content/portfolio'

describe('portfolio visitor journeys', () => {
  it('introduces Anthony and offers a real contact and downloadable CV', () => {
    const page = mount(App)
    expect(page.text()).toContain(portfolio.name)
    expect(page.text()).not.toMatch(/\bPRIVATE_PROJECT_MARKER\b/i)
    expect(page.text()).toContain('Field notes')
    expect(page.text()).not.toContain('Hello, world')
    expect(page.get('header .brand').text()).toContain('avltree9798')
    expect(page.find('a[href="mailto:me@avltree9798.co.uk"]').exists()).toBe(
      true,
    )
    expect(page.find('a[download]').attributes('href')).toBe(
      '/Anthony_Viriya_CV.pdf',
    )
  })
  it('filters work by category and restores the complete collection', async () => {
    const page = mount(App)
    const filter = page
      .findAll('button')
      .find((button) => button.text() === 'Open source')!
    await filter.trigger('click')
    expect(page.findAll('[data-project]')).toHaveLength(6)
    expect(page.text()).toContain('isJailbroken')
    expect(page.find('[data-project="security-automation"]').exists()).toBe(
      false,
    )
    await page
      .findAll('button')
      .find((button) => button.text() === 'All work')!
      .trigger('click')
    expect(page.findAll('[data-project]')).toHaveLength(
      portfolio.projects.length,
    )
  })
  it('shows a case study without claiming internal projects are public', async () => {
    const page = mount(App)
    await page
      .get('[data-project="security-automation"] button')
      .trigger('click')
    expect(page.get('dialog').text()).toContain('Internal project')
    expect(page.get('dialog').text()).toContain('Cloudflare')
    expect(page.get('dialog').text()).not.toMatch(/\bPRIVATE_PROJECT_MARKER\b/i)
    expect(page.get('dialog').find('a').exists()).toBe(false)
  })
  it('gives project details relevant headings instead of a generic change report', async () => {
    const page = mount(App)
    for (const [id, heading] of [
      ['security-automation', 'Impact'],
      ['pyloquent', 'Working with data'],
      ['clamshell', 'Development status'],
    ]) {
      await page.get(`[data-project="${id}"] button`).trigger('click')
      expect(page.get('dialog h3').text()).toBe(heading)
      expect(page.get('dialog').text()).not.toContain('What changed')
      await page.get('button[aria-label="Close project"]').trigger('click')
    }
  })
  it('toggles navigation on small screens', async () => {
    const page = mount(App)
    await page.get('button[aria-controls="navigation"]').trigger('click')
    expect(
      page
        .get('button[aria-controls="navigation"]')
        .attributes('aria-expanded'),
    ).toBe('true')
    await page.get('#navigation a').trigger('click')
    expect(
      page
        .get('button[aria-controls="navigation"]')
        .attributes('aria-expanded'),
    ).toBe('false')
  })
  it('links a side project to its live site and write-up without claiming public source', async () => {
    const page = mount(App)
    await page.get('[data-project="airtrace"] button').trigger('click')
    const links = page.findAll('dialog a')
    expect(links.map((a) => a.text())).toEqual([
      'Open Airtrace',
      'Read the write-up',
    ])
    expect(links[0].attributes('href')).toBe('https://adsb.avltree9798.co.uk')
    expect(links[1].attributes('href')).toBe('/blog/building-airtrace/')
    expect(page.get('dialog').text()).not.toContain('View source')
  })
  it('only links projects to write-ups that exist and are published', () => {
    for (const project of portfolio.projects) {
      if (!('article' in project) || !project.article) continue
      // Vitest runs from the repository root.
      const source = readFileSync(`content/posts/${project.article}.md`, 'utf8')
      expect(source, project.id).toMatch(/^draft: false$/m)
    }
  })
})

import { mount } from '@vue/test-utils'
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
})

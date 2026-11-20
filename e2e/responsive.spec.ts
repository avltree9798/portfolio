import { test, expect } from '@playwright/test'

const layouts = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'compact-phone', width: 320, height: 640 },
  { name: 'wide-phone', width: 430, height: 932 },
  { name: 'square', width: 720, height: 720 },
  { name: 'compact-square', width: 540, height: 540 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'duo-portrait', width: 430, height: 662 },
  { name: 'duo-wide', width: 760, height: 540 },
]
for (const layout of layouts) {
  test(`${layout.name}: readable layout and working project details`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(layout)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    if (layout.name.startsWith('duo-')) {
      const artwork = await page.locator('.landscape svg').boundingBox()
      expect(artwork).not.toBeNull()
      expect(artwork!.y + artwork!.height * 0.8).toBeLessThan(layout.height)
      const aircraft = await page.locator('.aircraft-pixels').boundingBox()
      expect(aircraft!.x).toBeGreaterThanOrEqual(artwork!.x)
      expect(aircraft!.x + aircraft!.width).toBeLessThanOrEqual(
        artwork!.x + artwork!.width,
      )
    }
    const cards = page.locator('[data-project]')
    await expect(cards).toHaveCount(7)
    if (layout.width <= 580) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click()
      await expect(page.getByRole('navigation')).toBeVisible()
      await page
        .getByRole('navigation')
        .getByRole('link', { name: 'Work', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Menu', exact: true }),
      ).toHaveAttribute('aria-expanded', 'false')
    }
    await page.getByRole('button', { name: 'Open source', exact: true }).click()
    await expect(cards).toHaveCount(6)
    await page.getByRole('button', { name: 'All work', exact: true }).click()
    const explore = page
      .locator('[data-project="security-automation"]')
      .getByRole('button')
    await explore.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('Internal project')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(explore).toBeFocused()
    const cv = await page.request.get('/Anthony_Viriya_CV.pdf')
    expect(cv.ok()).toBe(true)
    expect(cv.headers()['content-type']).toContain('application/pdf')
    expect(errors).toEqual([])
    await page.getByRole('heading', { level: 1 }).click()
    await page.evaluate(() => window.scrollTo(0, 0))
    if (
      ['desktop', 'phone', 'square', 'duo-portrait', 'duo-wide'].includes(
        layout.name,
      )
    ) {
      await page.screenshot({
        path: `/tmp/portfolio-previews/${layout.name}.png`,
        fullPage: true,
      })
      await page.screenshot({
        path: `/tmp/portfolio-previews/${layout.name}-hero.png`,
      })
    }
  })
}

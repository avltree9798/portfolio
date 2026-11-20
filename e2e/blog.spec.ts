import { test, expect } from '@playwright/test'
for (const width of [390, 760]) {
  test(`Markdown blog at ${width}px excludes drafts and keeps navigation usable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const response = await page.goto('/blog/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Field notes',
    )
    await expect(page.locator('body')).not.toContainText('Hello, world')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Portfolio' }),
    ).toBeVisible()
    const draft = await page.request.get('/blog/hello-world/')
    expect(draft.status()).toBe(404)
    expect(errors).toEqual([])
  })
}

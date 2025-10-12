import { test } from '@playwright/test'

test.describe.skip('市場スコープトグル', () => {
  test('市場タブとカテゴリフィルタの挙動を確認する', async ({ page }) => {
    await page.goto('http://localhost:4173/')

    await page.getByRole('button', { name: '市場スコープ: 国内' }).click()
    await page.getByRole('option', { name: '輸入' }).click()

    await page.getByRole('tab', { name: '葉菜類' }).click()

    await page.getByText('都市データが不足しているため最新価格を表示します').waitFor()
  })
})

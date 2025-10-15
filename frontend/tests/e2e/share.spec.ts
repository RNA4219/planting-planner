const { expect, test } = await import('@playwright/test')
import type { Page, Route } from '@playwright/test'

type Telemetry = { event: string; payload: Record<string, unknown> }

const crops = [{ id: 1, name: '春菊', category: 'leaf' }, { id: 2, name: '島しゅんぎく', category: 'leaf' }] as const
const recommendMap: Record<string, { week: string; region: string; items: unknown[] }> = {
  'temperate|national|leaf': { week: '2024-W30', region: 'temperate', items: [{ crop: '春菊', sowing_week: '2024-W28', harvest_week: '2024-W34', source: '全国統計', growth_days: 45 }] },
  'warm|national|leaf': { week: '2024-W31', region: 'warm', items: [{ crop: '島しゅんぎく', sowing_week: '2024-W29', harvest_week: '2024-W35', source: '暖地推定', growth_days: 42 }] },
}
const fulfillJson = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

const setupNavigator = (page: Page, supported: boolean) =>
  page.addInitScript((flag) => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false });
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    Object.defineProperty(window, '__setOnline', {
      value: (online: boolean) => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
        window.dispatchEvent(new Event(online ? 'online' : 'offline'));
      },
    });
    if (flag) {
      const calls: ShareData[] = [];
      Object.defineProperty(window, '__shareCalls', { value: calls });
      Object.defineProperty(navigator, 'share', { configurable: true, value: (data: ShareData) => (calls.push(data), Promise.resolve()) });
    } else {
      const clipboardCalls: string[] = [];
      Object.defineProperty(window, '__clipboardCalls', { value: clipboardCalls });
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => (clipboardCalls.push(text), Promise.resolve()) } });
    }
  }, supported)

const setupApi = async (page: Page, telemetry: Telemetry[], recommendRequests?: string[]) => {
  const context = page.context();
  await context.route('**/sw.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",()=>self.clients.claim());' }));
  await context.route('**/api/telemetry', async (route) => {
    const body = route.request().postData();
    if (body) {
      const parsed = JSON.parse(body) as Telemetry;
      telemetry.push({ event: parsed.event, payload: parsed.payload });
    }
    await route.fulfill({ status: 204, body: '' });
  });
  await context.route('**/api/crops', (route) => fulfillJson(route, crops));
  await context.route('**/api/recommend?**', async (route) => {
    const url = new URL(route.request().url());
    recommendRequests?.push(url.search);
    const key = `${url.searchParams.get('region') ?? 'temperate'}|${url.searchParams.get('marketScope') ?? 'national'}|${url.searchParams.get('category') ?? 'leaf'}`;
    await fulfillJson(route, recommendMap[key] ?? { week: '2024-W30', region: 'temperate', items: [] });
  });
  const resolveRefreshResponse = (route: Route) =>
    fulfillJson(route, { state: 'running', updated_records: 0, last_error: null });
  await context.route('**/api/refresh', resolveRefreshResponse);
  await context.route('**/refresh', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/refresh/status')) {
      return route.fallback();
    }
    return resolveRefreshResponse(route);
  });
  let statusCalls = 0;
  const resolveStatus = (route: Route) => {
    statusCalls += 1;
    return statusCalls === 1
      ? fulfillJson(route, { state: 'running' })
      : fulfillJson(route, { state: 'success', finished_at: '2024-03-10T12:34:00Z', updated_records: 3, last_error: null });
  };
  await context.route('**/api/refresh/status', resolveStatus);
  await context.route('**/refresh/status', resolveStatus);
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    let refreshStatusCount = 0;
    const refreshCalls: string[] = [];
    const refreshStatusCalls: string[] = [];
    Object.defineProperty(window, '__refreshCalls', { value: refreshCalls });
    Object.defineProperty(window, '__refreshStatusCalls', { value: refreshStatusCalls });
    window.fetch = async (...args) => {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/refresh')) {
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
        if (url.includes('/refresh/status')) {
          refreshStatusCount += 1;
          refreshStatusCalls.push(url);
          const body =
            refreshStatusCount === 1
              ? { state: 'running' }
              : { state: 'success', finished_at: '2024-03-10T12:34:00Z', updated_records: 3, last_error: null };
          return new Response(JSON.stringify(body), { status: 200, headers: [['content-type', 'application/json']] });
        }
        if (method.toUpperCase() === 'POST') {
          refreshCalls.push(url);
          return new Response(
            JSON.stringify({ state: 'running', updated_records: 0, last_error: null }),
            { status: 200, headers: [['content-type', 'application/json']] },
          );
        }
      }
      return originalFetch(...args);
    };
  });
}

test.describe('共有フロー', () => {
  test('Web Share API 経路', async ({ page }) => {
    const telemetry: Telemetry[] = [];
    const recommendRequests: string[] = [];
    await setupNavigator(page, true); await setupApi(page, telemetry, recommendRequests); await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Planting Planner' })).toBeVisible();
    const searchBox = page.getByRole('searchbox', { name: '作物検索' });
    await searchBox.fill('春');
    await expect(page.getByRole('row', { name: /春菊/ })).toBeVisible();
    const region = page.getByRole('combobox', { name: '地域' });
    await region.selectOption('warm');
    await expect(region).toHaveValue('warm');
    await searchBox.fill('島');
    const warmRecommendRequest = page.waitForRequest(
      (request) => request.url().includes('/api/recommend') && request.url().includes('region=warm'),
    );
    await page.getByRole('button', { name: 'この条件で見る' }).click();
    await warmRecommendRequest;
    expect(
      recommendRequests.some((entry) => entry.includes('region=warm') && entry.includes('category=leaf')),
    ).toBe(true);
    await page.getByRole('button', { name: '更新' }).click();
    await expect.poll(() =>
      page.evaluate(() => (window as typeof window & { __refreshCalls?: string[] }).__refreshCalls?.length ?? 0),
    ).toBe(1);
    const refreshCalls = await page.evaluate<string[]>(() =>
      (window as typeof window & { __refreshCalls?: string[] }).__refreshCalls ?? [],
    );
    const refreshStatusCalls = await page.evaluate<string[]>(() =>
      (window as typeof window & { __refreshStatusCalls?: string[] }).__refreshStatusCalls ?? [],
    );
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]).toContain('/refresh');
    expect(refreshStatusCalls.length).toBeGreaterThan(0);
    const toastStack = page.locator('[data-testid="toast-stack"]');
    await expect(toastStack.getByText('更新を開始しました', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(toastStack.getByText('データ更新が完了しました', { exact: false })).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => (window as typeof window & { __setOnline: (online: boolean) => void }).__setOnline(false));
    const offlineBanner = page.getByTestId('offline-status-banner');
    await expect(offlineBanner).toBeVisible();
    await expect.poll(() => telemetry.some((entry) => entry.event === 'offline.banner_shown')).toBe(true);
    const offlineEvent = telemetry.find((entry) => entry.event === 'offline.banner_shown');
    expect.soft(offlineEvent).toBeDefined();
    await page.evaluate(() => (window as typeof window & { __setOnline: (online: boolean) => void }).__setOnline(true));
    await expect(offlineBanner).toBeHidden();
    await page.getByRole('button', { name: '共有' }).click();
    await expect(page.getByText('共有リンクを送信しました')).toBeVisible();
    const shareCalls = await page.evaluate<ShareData[]>(() => (window as typeof window & { __shareCalls: ShareData[] }).__shareCalls);
    expect(shareCalls).toHaveLength(1);
    expect(shareCalls[0]).toMatchObject({ title: 'Planting Planner', text: expect.stringContaining('地域: 暖地'), url: expect.stringContaining('region=warm') });
  });

  test('Web Share API 非対応時はクリップボードへフォールバックする', async ({ page }) => {
    const telemetry: Telemetry[] = [];
    await setupNavigator(page, false); await setupApi(page, telemetry); await page.goto('/');
    const shareButton = page.getByRole('button', { name: '共有' });
    await expect(shareButton).toBeEnabled();
    await shareButton.click();
    await expect(page.getByText('共有リンクをコピーしました')).toBeVisible();
    const clipboardCalls = await page.evaluate<string[]>(() => (window as typeof window & { __clipboardCalls: string[] }).__clipboardCalls);
    expect(clipboardCalls).toHaveLength(1);
    expect(clipboardCalls[0]).toContain('category=leaf');
  });
});

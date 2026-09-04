import { expect, test, type Page } from '@playwright/test';

/**
 * Dialogs, where they actually appear.
 *
 * A modal `<dialog>` is centred by the user agent through `margin: auto` against its `inset: 0`.
 * A blanket `* { margin: 0 }` reset turns that into a dialog pinned to the top left corner, and
 * every dialog in Scalar had been there: 480px wide at 0,0 on a desktop, and hard against the
 * notch on a phone.
 *
 * Nothing in a component test could see it -- there is no layout in jsdom -- and nothing in the
 * app's own code was wrong, which is why it survived every review. It is checked here at both
 * sizes, because the fix is in a stylesheet that both share and the bug was never mobile-only.
 */

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ada@example.com',
  name: 'Ada',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const WORKSPACE = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Thesis',
  ownerId: USER.id,
  kind: 'team',
  role: 'owner',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const ACCOUNT = {
  id: WORKSPACE.id,
  provider: 'google_calendar',
  displayName: 'ada@example.com',
  status: 'active',
  connectedAt: '2026-09-01T10:00:00.000Z',
  canWriteCalendar: false,
  resources: [],
};

async function stubApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const bodies: Record<string, unknown> = {
      '/me': { user: USER, workspace: WORKSPACE },
      '/workspaces': { data: [WORKSPACE] },
      '/notifications': { data: [], nextCursor: null, unreadCount: 0 },
      '/focus/current': { session: null },
      '/integrations': { data: [ACCOUNT] },
    };
    await route.fulfill({ json: bodies[path] ?? { data: [], nextCursor: null } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('scalar.apiUrl', 'http://localhost:4000');
  });
}

/**
 * How far the open dialog's centre is from the viewport's, in pixels.
 *
 * It waits for the entry animation first. The dialog slides up six pixels as it opens, and a
 * measurement taken while that is running is off by however much of it is left -- which reads as a
 * centring bug, exactly the thing being tested, at whatever size the machine happened to be
 * running at that moment.
 */
async function offsetFromCentre(page: Page) {
  await page
    .locator('dialog[open]')
    .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
  return page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return null;
    const box = dialog.getBoundingClientRect();
    return {
      x: Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
      y: Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
      height: Math.round(box.height),
      viewportHeight: window.innerHeight,
    };
  });
}

const SIZES = [
  { label: 'a phone', width: 390, height: 844 },
  { label: 'a desktop', width: 1280, height: 800 },
] as const;

for (const size of SIZES) {
  test(`a confirmation is centred on ${size.label}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await stubApi(page);
    await page.goto('/settings/integrations');

    await page.getByRole('button', { name: 'Disconnect' }).first().click();
    await expect(page.getByRole('button', { name: 'Delete events' })).toBeVisible();

    const offset = await offsetFromCentre(page);
    expect(offset).not.toBeNull();
    // A pixel of rounding is fine. Half the screen is a dialog in the corner.
    expect(offset!.x).toBeLessThanOrEqual(1);
    expect(offset!.y).toBeLessThanOrEqual(1);
  });
}

test('a dialog never grows past the screen it is on', async ({ page }) => {
  // Short enough that a 400px dialog would not fit, which is what `max-height` is for. `dvh`
  // rather than `vh` matters here on a phone: `100vh` ignores the browser's own chrome, so a tall
  // dialog measured in it puts its last button under the address bar.
  await page.setViewportSize({ width: 390, height: 420 });
  await stubApi(page);
  await page.goto('/settings/integrations');

  await page.getByRole('button', { name: 'Disconnect' }).first().click();
  await expect(page.getByRole('button', { name: 'Delete events' })).toBeVisible();

  const offset = await offsetFromCentre(page);
  expect(offset!.height).toBeLessThanOrEqual(offset!.viewportHeight);
});

import { expect, test, type Page } from '@playwright/test';

/**
 * The phone shell, looked at rather than asserted about.
 *
 * The component tests render without a stylesheet, so they cannot see the thing that actually went
 * wrong here: the sidebar is `hidden md:flex`, and it was the only place the workspace was named
 * and the only route to notifications. On a phone both simply did not exist, and no test noticed,
 * because in jsdom the sidebar renders like everything else.
 *
 * That was survivable while everybody had one workspace. It stopped being survivable the day a
 * workspace could be shared: somebody capturing a thought has to be able to see which workspace it
 * is about to land in.
 */

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ada@example.com',
  name: 'Ada',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const PERSONAL = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Ada',
  ownerId: USER.id,
  kind: 'personal',
  role: 'owner',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const SHARED = {
  ...PERSONAL,
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Thesis',
  kind: 'team',
  role: 'member',
};

/*
 * A phone viewport on the browser CI already has, rather than `devices['iPhone 13']`.
 *
 * That preset selects WebKit, which nothing here installs: the suite would fail on a missing
 * executable rather than on a layout, and a test that cannot run is worse than no test. What is
 * being checked is width and touch, and both are set directly.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function openApp(page: Page, unreadCount = 0) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith('/me')) {
      await route.fulfill({ json: { user: USER, workspace: PERSONAL } });
      return;
    }
    if (pathname.endsWith('/workspaces')) {
      await route.fulfill({ json: { data: [PERSONAL, SHARED] } });
      return;
    }
    if (pathname.endsWith('/notifications')) {
      await route.fulfill({ json: { data: [], nextCursor: null, unreadCount } });
      return;
    }
    await route.fulfill({ json: { data: [], nextCursor: null } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('scalar.apiUrl', 'http://localhost:4000');
  });
  await page.goto('/tasks');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
}

test('the sidebar really is gone at this width', async ({ page }) => {
  await openApp(page);
  // The premise of everything below. If this ever fails, the rest is testing the wrong shell.
  await expect(page.locator('#sidebar')).toBeHidden();
});

test('the workspace is named on screen', async ({ page }) => {
  await openApp(page);

  const switcher = page.getByRole('button', { name: /Ada/ }).first();
  await expect(switcher).toBeVisible();

  // On screen, not merely in the document: a name pushed off a 390px bar is not a name anybody
  // reads, and that is the failure this whole file exists for.
  const box = await switcher.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
});

test('the workspace can be changed from a phone', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: /Ada/ }).first().tap();
  await expect(page.getByRole('button', { name: /Thesis/ })).toBeVisible();
});

test('notifications are reachable, and every control is thumb sized', async ({ page }) => {
  await openApp(page, 3);

  const bell = page.getByRole('link', { name: /Notifications/ });
  await expect(bell).toBeVisible();

  // 44px is the smallest target a finger reliably hits, and the tab bar already holds itself to
  // it. The top bar's controls are the ones that were never measured.
  for (const name of ['Notifications, 3 unread', 'Open command', 'Settings']) {
    const box = await page
      .getByRole(name === 'Open command' ? 'button' : 'link', { name })
      .boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.height, name).toBeGreaterThanOrEqual(44);
  }
});

test('nothing overflows the width', async ({ page }) => {
  await openApp(page, 3);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

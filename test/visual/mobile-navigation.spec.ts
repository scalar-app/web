import { expect, test, type Page } from '@playwright/test';

/**
 * Getting around Scalar on a phone.
 *
 * The shell's *furniture* had been measured -- the tab bar and the top bar hold themselves to
 * 44px, and a test says so. What had never been checked is where any of it goes, and that turned
 * out to be the half with the bugs in it:
 *
 *   - the tab bar was built by indexing into `primaryNav` with positions that no longer matched
 *     the comments beside them, so it shipped Focus where it said Inbox and left Calendar off
 *     entirely: on a phone the week was reachable only by typing its name into Command;
 *   - Command itself, which is the route to every destination the five tabs cannot hold, drew its
 *     options at 36px, because the sweep that sized every control for a finger looked for
 *     `a[href], button, input, select, textarea` and an option in a listbox is an `<li>`;
 *   - and a running focus session removes the shell on purpose, which left one 18px link as the
 *     only navigation on the whole screen.
 *
 * None of the three is visible in a component test: two are measurements, and the third is a
 * question about a list that jsdom renders as happily wrong as right. All three are visible here.
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
  name: 'Ada',
  ownerId: USER.id,
  kind: 'personal',
  role: 'owner',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const TASK = {
  id: '33333333-3333-4333-8333-333333333333',
  workspaceId: WORKSPACE.id,
  spaceId: null,
  projectId: null,
  title: 'Finish the differential geometry problem set',
  description: null,
  status: 'todo',
  priority: 'high',
  dueAt: '2026-09-05T12:00:00.000Z',
  scheduledStart: null,
  scheduledEnd: null,
  estimatedMinutes: 60,
  source: 'scalar',
  sourceUrl: null,
  parentTaskId: null,
  createdBy: USER.id,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  completedAt: null,
};

/** A session that is running, which is what asks the shell to get out of the way. */
const SESSION = {
  id: '44444444-4444-4444-8444-444444444444',
  taskId: TASK.id,
  taskTitle: TASK.title,
  status: 'active',
  plannedMinutes: 50,
  startedAt: '2026-09-04T09:00:00.000Z',
  endedAt: null,
  actualMinutes: null,
  notes: null,
};

async function stubApi(page: Page, options: { focus?: boolean } = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const bodies: Record<string, unknown> = {
      '/me': { user: USER, workspace: WORKSPACE },
      '/workspaces': { data: [WORKSPACE] },
      '/tasks': { data: [TASK], nextCursor: null },
      '/notifications': { data: [], nextCursor: null, unreadCount: 0 },
      '/focus/current': { session: options.focus ? SESSION : null },
    };
    await route.fulfill({ json: bodies[path] ?? { data: [], nextCursor: null } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('scalar.apiUrl', 'http://localhost:4000');
  });
}

/*
 * An explicit phone viewport with touch, rather than `devices['iPhone 13']`.
 *
 * That preset selects WebKit, which nothing here installs: the suite would fail on a missing
 * executable rather than on a layout, and a test that cannot run is worse than no test.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function openApp(page: Page, path = '/today') {
  await page.goto(path);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
}

/** Where the visible tab bar actually goes. The hidden sidebar shares its label, so ask by role. */
function tabBar(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' });
}

/**
 * Waits for the dialog to finish arriving before anything measures it.
 *
 * `sc-dialog-in` scales the dialog from 0.98, and a height read while that is running is short by
 * whatever is left of it: the rows below measured 43.2px against a computed `min-height` of 44px,
 * which reads exactly like a sizing bug and is a stopwatch. The scale factor is the same for the
 * whole subtree, so no amount of measuring a child gets around it.
 */
async function settled(page: Page) {
  await page
    .locator('dialog[open]')
    .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

test('the tab bar goes where it says it goes', async ({ page }) => {
  await stubApi(page);
  await openApp(page);

  // Written out rather than derived from `primaryNav`, on purpose: deriving it from the same
  // array the component indexes into is how the bug survived. If somebody reorders that array,
  // this is the test that should have an opinion about it.
  const destinations = await tabBar(page)
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href'),
        label: link.textContent?.trim(),
      })),
    );

  expect(destinations).toEqual([
    { href: '/today', label: 'Today' },
    { href: '/inbox', label: 'Inbox' },
    { href: '/ask', label: 'Ask' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/calendar', label: 'Calendar' },
  ]);
});

test('every screen can be reached without a keyboard', async ({ page }) => {
  await stubApi(page);
  await openApp(page);

  const tabs = await tabBar(page)
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const topBar = await page
    .locator('header')
    .first()
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

  // Command is the rest of the app. It is reached by tapping, not by pressing mod+k, because a
  // phone has no mod+k.
  await page.getByRole('button', { name: 'Open command' }).tap();
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await settled(page);
  const palette = await page
    .getByRole('option')
    .evaluateAll((options) =>
      options.map((option) => option.querySelector('kbd')?.textContent?.trim() ?? null),
    );

  const reachable = new Set([...tabs, ...topBar, ...palette]);
  // Every destination the app has: the eight primary screens, plus the two that live in the top
  // bar. A screen nobody can get to is not a screen.
  for (const href of [
    '/today',
    '/ask',
    '/focus',
    '/inbox',
    '/tasks',
    '/calendar',
    '/spaces',
    '/search',
    '/notifications',
    '/settings',
  ]) {
    expect([...reachable], href).toContain(href);
  }
});

test('every row of Command is thumb sized, and one of them navigates', async ({ page }) => {
  await stubApi(page);
  await openApp(page);

  await page.getByRole('button', { name: 'Open command' }).tap();
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await settled(page);

  /*
   * Measured, not asserted about. These are the only way to Focus, Spaces and Search on a phone,
   * and at 36px they were the smallest targets left in the app: the one navigation surface the
   * `a[href], button, ...` sweep could not see, because an option in a listbox is an `<li>`.
   */
  const tooSmall = await page.getByRole('option').evaluateAll((options) =>
    options
      .map((option) => ({
        label: option.textContent?.trim().slice(0, 40) ?? '',
        height: Math.round(option.getBoundingClientRect().height),
      }))
      .filter((option) => option.height < 44),
  );
  expect(tooSmall, JSON.stringify(tooSmall)).toEqual([]);

  // Sized is not the same as usable. Tap the row for a screen that has no tab and check we land.
  await page.getByRole('option', { name: 'Go to Spaces' }).tap();
  await expect(page).toHaveURL(/\/spaces$/);
});

/**
 * A running focus session, which is the one screen with no shell around it.
 *
 * That is deliberate -- a session that still has a tab bar and a task count beside it has not
 * reduced the system to one thing -- and it makes the single link out the whole of the phone's
 * navigation for as long as the session lasts.
 */
test('the way out of a focus session can be hit with a thumb', async ({ page }) => {
  await stubApi(page, { focus: true });
  await page.goto('/focus');

  const out = page.getByRole('link', { name: 'Leave this open and go back' });
  await expect(out).toBeVisible();

  // The premise. If a tab bar appears here the screen is no longer immersive, and this test is
  // measuring something other than what it claims to.
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();

  const box = await out.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);

  await out.tap();
  await expect(page).toHaveURL(/\/today$/);
});

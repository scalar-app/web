import { expect, test, type Page } from '@playwright/test';

/**
 * Every control on a phone, measured.
 *
 * A finger is not a mouse pointer, and the difference is about a centimetre. The shell knew this --
 * the tab bar and top bar hold themselves to 44px -- and nothing inside a page did, so the
 * navigation was thumb sized and everything it navigated to was not: 26px buttons, 32px inputs and
 * 16px checkboxes on every screen in the app.
 *
 * Component tests cannot see any of it. They render without a stylesheet, so every control is the
 * same zero-height box in jsdom whatever its CSS says. This walks the real screens in a real
 * browser at 390px with touch, and fails on the measurement rather than on an opinion.
 *
 * **Controls inside a sentence are exempt**, which is WCAG 2.5.8's own exception: a link in the
 * middle of a paragraph cannot be 44px tall without the paragraph becoming a list of buttons.
 *
 * The exemption is "is it inside prose", not "is its computed display inline", because the second
 * question cannot be asked of a button: Blink normalises a button's display, so `display: inline`
 * on one still computes as `inline-block` and every text button looks like a box to a measurement.
 * Being inside a `<p>` or a `<span>` of running text is the thing WCAG actually describes, and it
 * is answerable.
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

const PREFERENCES = {
  timeZone: 'UTC',
  weekStartsOn: 1,
  workdayStartMinute: 540,
  workdayEndMinute: 1020,
  workDays: [1, 2, 3, 4, 5],
  defaultFocusMinutes: 50,
  minimumBufferMinutes: 10,
  autoSchedule: 'suggest',
  durationLearningEnabled: true,
  updatedAt: null,
};

function task(n: number) {
  return {
    id: `3333333${String(n)}-3333-4333-8333-333333333333`,
    workspaceId: WORKSPACE.id,
    spaceId: null,
    projectId: null,
    title: `Task ${String(n)}`,
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
}

const TASKS = [task(1), task(2)];

/** Enough of an API for each screen to draw its controls. */
async function stubApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/home' || path === '/today' || path === '/timeline') {
      await route.fulfill({
        json: {
          date: '2026-09-04',
          timeZone: 'UTC',
          blocks: [],
          conflicts: [],
          attention: [],
          events: [],
          tasks: TASKS,
          overdue: [],
          dueToday: [],
          upcoming: [],
          unscheduled: [],
          focus: null,
          integrations: [],
          warnings: [],
          rangeStart: '2026-09-04T00:00:00.000Z',
          rangeEnd: '2026-09-05T00:00:00.000Z',
        },
      });
      return;
    }
    const bodies: Record<string, unknown> = {
      '/me': { user: USER, workspace: WORKSPACE },
      '/workspaces': { data: [WORKSPACE] },
      '/tasks': { data: TASKS, nextCursor: null },
      '/preferences': PREFERENCES,
      '/notifications': { data: [], nextCursor: null, unreadCount: 2 },
      '/focus/current': { session: null },
      '/integrations': { data: [] },
    };
    await route.fulfill({ json: bodies[path] ?? { data: [], nextCursor: null } });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('scalar.apiUrl', 'http://localhost:4000');
  });
}

/** Controls that are laid out as boxes, and the height each one offers a thumb. */
async function boxControls(page: Page) {
  return page.evaluate(() => {
    const out: { name: string; height: number; width: number }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      'a[href], button, input:not([type="checkbox"]), select, textarea',
    )) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // WCAG 2.5.8's inline exception: a control that is a word in a sentence.
      if (el.closest('p, span')) continue;
      const name =
        el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? el.tagName;
      out.push({ name, height: Math.round(rect.height), width: Math.round(rect.width) });
    }
    return out;
  });
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const SCREENS = [
  '/today',
  '/inbox',
  '/tasks',
  '/calendar',
  '/focus',
  '/ask',
  '/spaces',
  '/search',
  '/notifications',
  '/settings',
  '/settings/integrations',
  '/settings/workspace',
];

for (const screen of SCREENS) {
  test(`every control on ${screen} is thumb sized`, async ({ page }) => {
    await stubApi(page);
    await page.goto(screen);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

    const tooSmall = (await boxControls(page)).filter((control) => control.height < 44);
    expect(tooSmall, `${screen}: ${JSON.stringify(tooSmall)}`).toEqual([]);
  });
}

/**
 * The checkbox is the exception that proves the rule: it keeps its 16px box and grows its *target*.
 *
 * A 44px checkbox would be a design change on every list in the app. A 44px hit area around a 16px
 * box is what a person needs and is invisible, which is why it has to be tested by tapping next to
 * the box rather than by measuring it.
 */
test('a checkbox can be hit from outside its box', async ({ page }) => {
  await stubApi(page);
  await page.goto('/settings');

  const checkbox = page.locator('input[type=checkbox]').first();
  await expect(checkbox).toBeVisible();
  const before = await checkbox.isChecked();
  const box = (await checkbox.boundingBox())!;
  expect(Math.round(box.width)).toBe(16);

  // 12px clear of the visual box: a miss before the hit area existed.
  await page.mouse.click(box.x - 12, box.y + box.height / 2);

  await expect(checkbox).toBeChecked({ checked: !before });
});

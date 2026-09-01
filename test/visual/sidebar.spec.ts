import { expect, test, type Page } from '@playwright/test';

/**
 * The sidebar, looked at rather than asserted about.
 *
 * Every case here covers a defect that shipped green. The Command button collapsed to the same
 * magnifier the Search destination uses, eight rows down the same column. The collapse toggle sat
 * 16px left of every other icon, because a button shrink wraps even as a flex container. The
 * Command button drew none of the border, background or padding it asked for, because an unlayered
 * reset in `@scalar/ui` beat the utilities.
 *
 * The component tests render without a stylesheet, so none of that was visible to them. Nothing
 * below can be checked anywhere but in a browser.
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

/**
 * There is no API in CI, and the shell only renders for somebody signed in. Answering `/me` is
 * enough: a list that fails leaves an empty badge, and the sidebar is the subject either way.
 *
 * `/me` answers with a workspace as well as a user, and it has to: `MeResponseSchema` in
 * `@scalar/sdk` requires both, and a response that does not parse reaches the shell as a fault
 * rather than as a bad shape — "Cannot reach your Scalar server", which is what a stub answering
 * `{ user }` alone produced here for eleven days.
 */
async function openSidebar(page: Page, state: 'collapsed' | 'expanded') {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const body = pathname.endsWith('/me')
      ? { user: USER, workspace: WORKSPACE }
      : { data: [], nextCursor: null };
    await route.fulfill({ json: body });
  });

  // Set before any script runs, so the first paint is already the state under test.
  //
  // The API address is here for a different reason than the collapse state. The app asks for one
  // before it renders anything else — `isApiConfigured` in `src/lib/api.ts`, the "Connect to your
  // Scalar" screen — and there is no build time default in CI, so without this the page under
  // test is the setup form and `#sidebar` does not exist. That is what these six have been
  // failing on since the setup screen shipped: not a sidebar defect, an app that never got as far
  // as drawing one. The route handler above still answers everything; this only decides where it
  // is answering for.
  await page.addInitScript(
    (value) => {
      window.localStorage.setItem('scalar.apiUrl', 'http://localhost:4000');
      window.localStorage.setItem('scalar.sidebarCollapsed', value);
    },
    state === 'collapsed' ? '1' : '0',
  );

  await page.goto('/tasks');
  await expect(page.locator('#sidebar')).toBeVisible();
}

/** Every icon in the rail, with the horizontal centre of its glyph. */
async function iconCentres(page: Page) {
  return page.locator('#sidebar').evaluate((bar) =>
    [...bar.querySelectorAll('a[href], button')].flatMap((row) => {
      const icon = row.querySelector('svg');
      if (!icon) return [];
      const box = icon.getBoundingClientRect();
      const name = row.getAttribute('aria-label') ?? row.getAttribute('href') ?? '?';
      return [{ name, centre: Math.round(box.left + box.width / 2) }];
    }),
  );
}

test.describe('collapsed', () => {
  test('every icon sits in one column', async ({ page }) => {
    await openSidebar(page, 'collapsed');

    const centres = await iconCentres(page);
    expect(centres.length).toBeGreaterThan(8);
    // Reported as the full list so a failure names the row that is out of line.
    expect(new Set(centres.map((row) => row.centre)).size, JSON.stringify(centres)).toBe(1);
  });

  test('Command and Search do not wear the same icon', async ({ page }) => {
    await openSidebar(page, 'collapsed');

    const command = page.locator('#sidebar button[aria-label="Command"] svg');
    const search = page.locator('#sidebar a[href="/search"] svg');

    await expect(command).toHaveCount(1);
    expect(await command.getAttribute('class')).not.toBe(await search.getAttribute('class'));
  });

  test('is narrow enough to be worth collapsing', async ({ page }) => {
    await openSidebar(page, 'collapsed');

    const width = await page.locator('#sidebar').evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThan(80);
  });
});

test.describe('expanded', () => {
  test('the collapse row is indented like the rows above it', async ({ page }) => {
    await openSidebar(page, 'expanded');

    const padding = (selector: string) =>
      page.locator(selector).evaluate((el) => getComputedStyle(el).paddingLeft);

    expect(await padding('#sidebar [aria-controls="sidebar"]')).toBe(
      await padding('#sidebar a[href="/today"]'),
    );
  });

  test('the Command button draws the box it asks for', async ({ page }) => {
    await openSidebar(page, 'expanded');

    const drawn = await page
      .locator('#sidebar button', { hasText: 'Command' })
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          borderWidth: style.borderTopWidth,
          background: style.backgroundColor,
          paddingLeft: style.paddingLeft,
        };
      });

    expect(drawn.borderWidth).not.toBe('0px');
    expect(drawn.paddingLeft).not.toBe('0px');
    // Anything but fully transparent: the token itself is free to change.
    expect(drawn.background).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('the rail is attached to every run, so somebody can look', async ({ page }, testInfo) => {
  for (const state of ['collapsed', 'expanded'] as const) {
    await openSidebar(page, state);
    // The dev overlay parks itself over the bottom left corner, which is where the toggle lives.
    await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
    await testInfo.attach(`sidebar-${state}`, {
      body: await page.locator('#sidebar').screenshot(),
      contentType: 'image/png',
    });
  }
});

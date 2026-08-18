# Scalar web

The authenticated Scalar web application: Today, Inbox, Tasks, Calendar, Spaces, Search, Settings and the Command palette. Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, `@scalar/ui`, `@scalar/sdk`.

Part of [scalar-app](https://github.com/scalar-app). Talks only to the [Scalar API](https://github.com/scalar-app/api) through the SDK; there is no server side data layer in this app.

## Run it

Requires Node 24 (`.nvmrc`) and pnpm 11. Until `@scalar/ui` and `@scalar/sdk` are published they are consumed with pnpm's `link:` protocol from sibling checkouts, so clone the three repositories side by side and build the two packages first:

```text
scalar/
  api/
  sdk/
  ui/
  web/
```

```bash
pnpm --dir ../ui install && pnpm --dir ../ui build
pnpm --dir ../sdk install && pnpm --dir ../sdk build
pnpm install
cp .env.example .env.local
pnpm dev
```

Then start the API (`pnpm dev` in `../api`, see its README) and open `http://localhost:3000`. Sign in with any email; the API runs in development mode and shows the sign in link on screen because email delivery is not built yet.

`next.config.ts` sets `turbopack.root` to the parent folder so Turbopack can resolve the linked packages. That override disappears once the packages come from npm.

## Environment

| Variable              | Purpose                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Origin of the Scalar API. The browser calls it directly with `credentials: include`, so the API's `APP_ORIGIN` must include this app's origin. |

## How it is put together

```
src/app/
  layout.tsx, providers.tsx      root layout, TanStack Query provider
  login/, auth/verify/           magic link request and verification
  (app)/layout.tsx               authenticated shell (session guard, sidebar, ⌘K)
  (app)/today|inbox|tasks|calendar|spaces|search|settings
src/components/shell/            Sidebar, CommandPalette, AppShell, navigation
src/components/tasks/            TaskRow, TaskList, QuickAddTask
src/lib/api.ts                   the single SDK client
src/lib/queries/                 hooks per domain (auth, tasks, today, spaces, events)
src/lib/time.ts                  local date helpers
```

Principles: the API is the source of truth for authentication (the shell asks `/me`, it never guesses from cookies); server components render structure, client components own data; every list has loading, empty and error states; every mutation invalidates the views it affects and task completion is optimistic.

Design tokens come from `@scalar/ui`. `globals.css` maps them into Tailwind's theme, so utilities like `bg-surface`, `text-secondary` and `text-yellow` are the only way colors enter this app.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (ESLint and Prettier), `pnpm typecheck` (`next typegen` then `tsc`), `pnpm test` (Vitest, jsdom), `pnpm format`.

## Tests

Unit tests for the time helpers and a component test for `TaskRow`. Critical journeys (sign in, create task, complete task, Today) are covered by the API integration suite today; Playwright end to end tests will be added when the API has an easy seeded fixture mode.

## Status

Implemented: magic link sign in and sign out, session guard, Today (greeting, attention count, urgent, overdue, due today, upcoming events), Tasks (quick add, open/done/all filters, complete and reopen with optimistic updates), Calendar (week view of API events, navigation), Spaces (list and create), Settings (account, sign out), Command palette (navigation, quick task capture, keyboard driven, combobox semantics).

Not implemented yet: Inbox and Search (empty states explain why), task detail editing, space detail pages, integrations, notifications, AI commands, onboarding and usage modes, mobile navigation (the layout is desktop first for now).

## Contributing

See [scalar-app/.github/CONTRIBUTING.md](https://github.com/scalar-app/.github/blob/main/CONTRIBUTING.md).

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).

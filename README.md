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
  (app)/settings/integrations   connect, sync status, disconnect
src/components/shell/            Sidebar, CommandPalette, AppShell, navigation
src/components/tasks/            TaskRow, TaskList, QuickAddTask
src/lib/api.ts                   the single SDK client
src/lib/queries/                 hooks per domain (auth, tasks, today, spaces, events)
src/lib/time.ts                  local date helpers
```

Principles: the API is the source of truth for authentication (the shell asks `/me`, it never guesses from cookies); server components render structure, client components own data; every list has loading, empty and error states; every mutation invalidates the views it affects and task completion is optimistic.

Design tokens come from `@scalar/ui`. `globals.css` maps them into Tailwind's theme, so utilities like `bg-surface`, `text-secondary` and `text-yellow` are the only way colors enter this app.

## Ask

`/ask` is a conversation with Scalar Command. Questions are answered by reading your tasks and calendar. Anything that would change them arrives as an approval card instead: it says what would happen, in plain language, and does nothing until you press Approve.

Approve is never the default. It is not focused automatically, Enter in the composer sends the question rather than approving a pending card, and once a card is decided its buttons are gone.

Past conversations are reachable from History. Reopening one restores it, including its approval cards: a proposal you left pending is still approvable later, and one you already approved shows as done rather than offering itself again. Asking another question continues that same conversation; New starts a fresh one.

Without `ANTHROPIC_API_KEY` on the API the page explains that Ask is not set up on this server, and the rest of Scalar works normally.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (ESLint and Prettier), `pnpm typecheck` (`next typegen` then `tsc`), `pnpm test` (Vitest, jsdom), `pnpm format`.

## Tests

Unit tests for the time helpers, and component tests for `TaskRow`, `ApprovalCard` and `AskView`. The approval tests are the ones to keep passing: they pin down that a proposed change does nothing until somebody presses Approve. Critical journeys (sign in, create task, complete task, Today) are covered by the API integration suite today; Playwright end to end tests will be added when the API has an easy seeded fixture mode.

## Status

Implemented: magic link sign in and sign out, session guard, Today (greeting, attention count, urgent, overdue, due today, upcoming events), Tasks (quick add, open/done/all filters, complete and reopen with optimistic updates), Calendar (week view of synced events, navigation), Spaces (list and create), Settings (account, sign out), Integrations (connect Google Calendar, per calendar sync status that polls while a sync runs, sync now, reconnect when access is revoked, disconnect with a keep or delete choice for imported events), Command palette (navigation, quick task capture, handoff to Ask, keyboard driven, combobox semantics), Ask (conversation with Scalar Command: answers from your own tasks and calendar, approval cards for anything that would change them, and history of past conversations that can be reopened and continued), responsive shell (sidebar on desktop, collapsible to an icon rail with ⌘\ and remembered across reloads, top bar and thumb reachable tab bar on phones).

Inbox (triage of anything captured but not filed: keep, file into a space, or dismiss) and Search (across tasks, events and spaces, with the term in the URL so a search can be linked to).

Not implemented yet: task detail editing, space detail pages, notifications, onboarding and usage modes.

## Contributing

See [scalar-app/.github/CONTRIBUTING.md](https://github.com/scalar-app/.github/blob/main/CONTRIBUTING.md).

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).

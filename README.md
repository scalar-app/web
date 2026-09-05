# Scalar web

The authenticated Scalar web application: Today, Ask, Focus, Inbox, Tasks, Calendar, Spaces, Search, Notifications, Settings and the Command palette. Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, `@scalar/ui`, `@scalar/sdk`.

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

Then start the API (`pnpm dev` in `../api`, see its README) and open `http://localhost:3000`. Sign in with any email: in development, with no SMTP host configured, the API returns the sign in link and this app shows it on screen. Email delivery is implemented; configure `SMTP_HOST` on the API and the link is mailed instead, which is what a deployed install does.

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
  (app)/today|ask|focus|inbox|tasks|calendar|spaces|search|notifications|settings
  (app)/settings/integrations   connect, sync status, disconnect
  (app)/settings/workspace      members, roles, invitations
  (app)/invitations/[token]     preview and accept an invitation
src/components/shell/            AppShell, Sidebar, MobileNav, CommandPalette, WorkspaceSwitcher, navigation
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

Without a model configured on the API (`AI_PROVIDER` with `AI_API_KEY`) the page explains that Ask is not set up on this server, and the rest of Scalar works normally.

What Ask cannot do is worth knowing, because the tool list is the whole surface: it cannot read your email or your inbox, create a calendar event, create or rename or delete a space or project, delete a task, start a focus session, or run the planner. Answers are not streamed. It does read your calendar, which is how it answers what is on tomorrow, but reading is all it does there.

One thing it can do reads as more than it is. Approving a "schedule this task" card sets the time **inside Scalar**; nothing appears on a connected Google Calendar. The only path that writes to a real calendar is Plan my day, applied with the publish option.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (ESLint and Prettier), `pnpm typecheck` (`next typegen` then `tsc`), `pnpm test` (Vitest, jsdom), `pnpm format`.

## Tests

`pnpm test` runs Vitest in jsdom: unit tests for the time helpers, and component tests for the views (Today, Ask, Calendar, Focus, Inbox, Search, Notifications, Integrations, workspace members, accepting an invitation) and for the shell and the pieces with logic in them (`AppShell`, `Sidebar`, `MobileNav`, `WorkspaceSwitcher`, `TaskRow`, `ApprovalCard`, the planner preview, the timeline and the settings panels). The approval tests are the ones to keep passing: they pin down that a proposed change does nothing until somebody presses Approve. Critical journeys (sign in, create task, complete task, Today) are covered by the API integration suite.

`pnpm test:visual` runs Playwright against a real browser and a real build: `test/visual/` covers the sidebar, the mobile shell and navigation, touch target sizes and where dialogs actually appear. Those live there because jsdom has no layout, so a component test cannot see a breakpoint, a viewport width or a tap target, and will pass whatever the answer is.

## Status

Implemented: magic link sign in and sign out, session guard, Today (greeting, attention count, urgent, overdue, due today, upcoming events), Tasks (quick add, open/done/all filters, complete and reopen with optimistic updates), Calendar (week view of synced events, navigation), Spaces (list and create), Settings (account, sign out), Integrations (connect Google Calendar, per calendar sync status that polls while a sync runs, sync now, reconnect when access is revoked, disconnect with a keep or delete choice for imported events), Command palette (navigation, quick task capture, handoff to Ask, keyboard driven, combobox semantics), Ask (conversation with Scalar Command: answers from your own tasks and calendar, approval cards for anything that would change them, and history of past conversations that can be reopened and continued), responsive shell (sidebar on desktop, collapsible to an icon rail with ⌘\ and remembered across reloads; on a phone a top bar carrying the workspace name, notifications, search and settings, and a thumb reachable tab bar for Today, Inbox, Ask, Tasks and Calendar).

Inbox (triage of anything captured but not filed: keep, file into a space, or dismiss) and Search (across tasks, events and spaces, with the term in the URL so a search can be linked to).

Also implemented since: Focus, Notifications (a page and an unread count in the sidebar), data export from Settings, the workspace switcher with a members page and invitations, and asking before a plan is put on somebody's calendar.

The phone is a supported size, not a smaller desktop: the shell above, controls sized for a finger where the pointer is coarse, text fields at 16px so iOS stops zooming the page, dialogs centred and kept clear of a notch, and the layout drawing into the safe area rather than around it. Those last parts live in `@scalar/ui`, so they hold for anything built on it.

Not implemented, and each one is something the API can already do with no way to reach it from here:

- **Editing or deleting a task.** What the app can change about a task is its `status` (the done checkbox, and Inbox's keep and dismiss) and, from Inbox, its space. Nothing else: `QuickAddTask` posts a title, `TaskList` passes `TaskRow` no `onSelect` even though `TaskRow` accepts one, and `useDeleteTask` has no callers. `PATCH /api/v1/tasks/:id` also accepts title, description, project, priority, due date, schedule and estimate, and `DELETE` works; no screen reaches either.
- **Renaming, archiving or deleting a space.** `spaces.ts` exports `useSpaces` and `useCreateSpace` and nothing else.
- **Projects.** No screen at all, so the projects Canvas creates are invisible here.
- **Creating a calendar event.** Not this app's gap: the API has no write route for events, so Calendar is a read-only week list.
- **Choosing what syncs.** Resources are discovered once, at connect time. A Canvas course added mid-term, a second Google calendar, or a Gmail label other than Starred cannot be selected without disconnecting and reconnecting.
- **Connecting Google Calendar once anything else is connected.** The button lives only in the empty state, so it disappears as soon as any account exists. Gmail and Canvas have their own always-rendered panels.

Also not built: space detail pages, onboarding and usage modes.

## Contributing

See [scalar-app/.github/CONTRIBUTING.md](https://github.com/scalar-app/.github/blob/main/CONTRIBUTING.md).

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).

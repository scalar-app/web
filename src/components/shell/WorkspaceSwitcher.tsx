'use client';

import { cx } from '@scalar/ui';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSessionContext } from '@/lib/queries/auth';
import { useActivateWorkspace, useCreateWorkspace, useWorkspaces } from '@/lib/queries/workspaces';

/**
 * Which workspace you are looking at, and how to change it.
 *
 * It sits at the top of the rail under the logo, because everything below it -- Today, Inbox,
 * Tasks -- means something different depending on the answer, and a person who cannot see which
 * workspace they are in can write a private note into a shared one.
 *
 * Nothing appears here for somebody with one workspace, which is most people. A switcher with one
 * entry is a control that teaches you it does nothing.
 */
export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const workspaces = useWorkspaces();
  const context = useSessionContext();
  const activate = useActivateWorkspace();
  const create = useCreateWorkspace();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const current = context.data?.workspace ?? null;
  const all = workspaces.data ?? [];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent): void {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!current || (all.length < 2 && !open)) {
    // One workspace and nothing open: show the name, quietly, with the way to make another.
    return (
      <div ref={box} className="relative mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={collapsed ? `Workspace: ${current?.name ?? ''}` : undefined}
          title={collapsed ? current?.name : undefined}
          className={cx(
            'flex w-full items-center rounded-md py-1.5 text-[12px] text-muted transition-colors hover:bg-surface hover:text-secondary',
            collapsed ? 'justify-center px-0' : 'gap-2 px-3',
          )}
        >
          {collapsed ? (
            <ChevronsUpDown size={14} aria-hidden />
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{current?.name ?? ''}</span>
              <ChevronsUpDown size={13} aria-hidden />
            </>
          )}
        </button>
        {open ? <Menu /> : null}
      </div>
    );
  }

  function Menu() {
    return (
      <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-md border border-border bg-raised p-1 shadow-lg">
        <ul className="flex flex-col">
          {all.map((workspace) => (
            <li key={workspace.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (workspace.id !== current?.id) activate.mutate(workspace.id);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-secondary transition-colors hover:bg-surface hover:text-primary"
              >
                <span className="w-4 shrink-0">
                  {workspace.id === current?.id ? <Check size={13} aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {/* Which of these is yours alone, said once, where the choice is made. */}
                <span className="shrink-0 text-[11px] text-muted">
                  {workspace.kind === 'personal' ? 'personal' : workspace.role}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-1 border-t border-border pt-1">
          {naming ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = name.trim();
                if (!trimmed) return;
                create.mutate(
                  { name: trimmed },
                  {
                    onSuccess: () => {
                      setName('');
                      setNaming(false);
                      setOpen(false);
                    },
                  },
                );
              }}
              className="p-1"
            >
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name this workspace"
                aria-label="Name this workspace"
                className="w-full rounded border border-border bg-background px-2 py-1 text-[13px] text-primary outline-none focus:border-muted"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setNaming(true)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-secondary transition-colors hover:bg-surface hover:text-primary"
            >
              <span className="w-4 shrink-0">
                <Plus size={13} aria-hidden />
              </span>
              <span>New shared workspace</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={box} className="relative mb-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? `Workspace: ${current.name}` : undefined}
        title={collapsed ? current.name : undefined}
        className={cx(
          'flex w-full items-center rounded-md border border-border py-1.5 text-[12px] text-secondary transition-colors hover:border-muted hover:text-primary',
          collapsed ? 'justify-center px-0' : 'gap-2 px-3',
        )}
      >
        {collapsed ? (
          <ChevronsUpDown size={14} aria-hidden />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{current.name}</span>
            <ChevronsUpDown size={13} aria-hidden />
          </>
        )}
      </button>
      {open ? <Menu /> : null}
    </div>
  );
}

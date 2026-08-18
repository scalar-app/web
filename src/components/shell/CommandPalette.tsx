'use client';

import { Dialog, Input, Kbd, StatusLight } from '@scalar/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCreateTask } from '@/lib/queries/tasks';
import { primaryNav, settingsNav } from './navigation';

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Stage 1 palette: navigation and quick task capture. Natural language commands arrive with the
 * AI layer; the UI is built so those results slot into the same list.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const createTask = useCreateTask();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  function close() {
    setQuery('');
    setActive(0);
    onClose();
  }

  const trimmed = query.trim();

  const commands = useMemo<Command[]>(() => {
    const nav = [...primaryNav, settingsNav].map<Command>((item) => ({
      id: `nav:${item.href}`,
      label: `Go to ${item.label}`,
      hint: item.href,
      run: () => router.push(item.href),
    }));
    const matches = trimmed
      ? nav.filter((c) => c.label.toLowerCase().includes(trimmed.toLowerCase()))
      : nav;
    if (!trimmed) return matches;
    const create: Command = {
      id: 'task:create',
      label: `Create task "${trimmed}"`,
      hint: 'Enter',
      run: async () => {
        await createTask.mutateAsync({ title: trimmed });
        router.push('/tasks');
      },
    };
    return [create, ...matches];
  }, [trimmed, router, createTask]);

  const clamped = Math.min(active, Math.max(commands.length - 1, 0));

  async function runCommand(command: Command | undefined) {
    if (!command) return;
    await command.run();
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, commands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void runCommand(commands[clamped]);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      size="md"
      showClose={false}
      initialFocusRef={inputRef}
      aria-label="Command"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <StatusLight
            tone={createTask.isPending ? 'yellow' : 'neutral'}
            pulse={createTask.isPending}
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or a task title"
            aria-label="Command"
            aria-controls={listId}
            aria-activedescendant={
              commands[clamped] ? `${listId}-${commands[clamped].id}` : undefined
            }
            role="combobox"
            aria-expanded
            autoComplete="off"
            className="flex-1"
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="Commands"
          className="flex max-h-72 flex-col overflow-y-auto"
        >
          {commands.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-muted">No matching commands.</li>
          ) : null}
          {commands.map((command, index) => {
            const selected = index === clamped;
            return (
              <li
                key={command.id}
                id={`${listId}-${command.id}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void runCommand(command)}
                className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px] ${selected ? 'bg-raised text-primary' : 'text-secondary'}`}
              >
                <span className="flex items-center gap-2">
                  {command.id === 'task:create' ? <Plus size={14} aria-hidden /> : null}
                  {command.label}
                </span>
                {command.hint ? <Kbd>{command.hint}</Kbd> : null}
              </li>
            );
          })}
        </ul>
        {createTask.isError ? (
          <p role="alert" className="text-[13px] text-danger">
            Task could not be created. Try again.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

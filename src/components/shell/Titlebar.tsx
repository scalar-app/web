'use client';

import { cx } from '@scalar/ui';
import { Minus, Square, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNativePlatform, windowControls } from './native';

/**
 * The window's own chrome, drawn by the app rather than by the operating system.
 *
 * The desktop shell hides the system title bar: on macOS it keeps the traffic lights and drops the
 * bar behind them, and on Windows and Linux it drops the decorations entirely. What is left is a
 * strip the app draws itself, so the window reads as one surface instead of an app wearing a grey
 * hat that belongs to a different decade.
 *
 * In a browser this renders nothing at all, which is why it can sit in the root layout.
 */

/** Wide enough for three 46px controls, so the title never collides with them. */
const CONTROL_WIDTH = 46;

function Control({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{ width: CONTROL_WIDTH }}
      className={cx(
        'flex h-full items-center justify-center text-secondary transition-colors',
        danger ? 'hover:bg-danger hover:text-background' : 'hover:bg-surface hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function Titlebar() {
  const platform = useNativePlatform();
  const [maximized, setMaximized] = useState(false);

  // The window can be maximized by a double click on the drag region or by the operating system's
  // own snap, neither of which comes through the buttons below.
  useEffect(() => {
    if (!platform || platform === 'macos') return;
    const controls = windowControls();
    if (!controls) return;

    let cancelled = false;
    const sync = () => {
      void controls.isMaximized().then((value) => {
        if (!cancelled) setMaximized(value);
      });
    };
    sync();
    window.addEventListener('resize', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', sync);
    };
  }, [platform]);

  const call = useCallback(
    (run: (controls: NonNullable<ReturnType<typeof windowControls>>) => void) => {
      const controls = windowControls();
      if (controls) run(controls);
    },
    [],
  );

  if (!platform) return null;

  const mac = platform === 'macos';

  return (
    <header
      // Tauri drags the window by any element carrying this attribute, and maximizes on a double
      // click. "deep" (2.11 and later) extends that to the text inside, so the whole strip drags
      // rather than only the gaps between things.
      data-tauri-drag-region="deep"
      className={cx(
        'flex shrink-0 items-center border-b border-border bg-background select-none',
        // The traffic lights are still the system's on macOS, and they sit here.
        mac && 'pl-[78px]',
      )}
      style={{ height: 'var(--sc-titlebar)' }}
    >
      <span className={cx('flex-1 truncate text-[12px] text-muted', mac ? 'text-center' : 'pl-3')}>
        Scalar
      </span>

      {mac ? (
        // Balances the traffic lights, so a centred title is centred in the window rather than in
        // what is left of it.
        <span aria-hidden className="w-[78px]" />
      ) : (
        // Opted out of the drag region above, so a click on a control is a click, never a drag.
        <div data-tauri-drag-region="false" className="flex h-full items-stretch">
          <Control label="Minimize" onClick={() => call((c) => void c.minimize())}>
            <Minus size={14} strokeWidth={1.75} aria-hidden />
          </Control>
          <Control
            label={maximized ? 'Restore' : 'Maximize'}
            onClick={() =>
              call((c) => {
                void c.toggleMaximize().then(setMaximized);
              })
            }
          >
            <Square size={12} strokeWidth={1.75} aria-hidden />
          </Control>
          <Control label="Close" danger onClick={() => call((c) => void c.close())}>
            <X size={15} strokeWidth={1.75} aria-hidden />
          </Control>
        </div>
      )}
    </header>
  );
}

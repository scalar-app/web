'use client';

import type { Preferences, UpdatePreferencesInput } from '@scalar/sdk';
import { Button, Checkbox, Input, Panel, Spinner } from '@scalar/ui';
import { useMemo, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { usePreferences, useUpdatePreferences } from '@/lib/queries/preferences';

/**
 * The planner's inputs, in the person's words.
 *
 * Nothing here schedules anything yet. It exists first because a planner with no working hours has
 * to invent them, and inventing them is how scheduling software ends up proposing 3am.
 */

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

function toTimeValue(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fromTimeValue(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Every zone the browser knows, each with its current offset.
 *
 * There are several hundred of these, which is why this is a field you type into rather than a
 * dropdown you scroll: nobody finds Europe/Tallinn in an alphabetical list that starts at
 * Africa/Abidjan. The offset is on each row because "UTC+03:00" is how most people recognise
 * their own zone, and it is computed once rather than per keystroke.
 */
function timeZones(current: string): { zone: string; offset: string }[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const all = supported.length > 0 ? supported : [current, 'UTC'];
  const now = new Date();
  return [...new Set([current, ...all])].map((zone) => ({ zone, offset: offsetLabel(zone, now) }));
}

/** `UTC+03:00` for a zone, or an empty string for one this browser cannot resolve. */
function offsetLabel(zone: string, now: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value;
    // Browsers phrase this as GMT+03:00; the rest of Scalar says UTC, so say UTC here too.
    return formatted ? formatted.replace(/^GMT/, 'UTC') : '';
  } catch {
    return '';
  }
}

function detectedZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function PlanningForm({ preferences }: { preferences: Preferences }) {
  const save = useUpdatePreferences();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [invalidHours, setInvalidHours] = useState(false);
  // Several hundred entries, and the offsets need a Date. Worth doing once per mount.
  const zones = useMemo(() => timeZones(preferences.timeZone), [preferences.timeZone]);
  const knownZone = zones.some((entry) => entry.zone === draft.timeZone);

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
    save.reset();
  }

  function toggleDay(day: number, on: boolean): void {
    const next = on ? [...draft.workDays, day] : draft.workDays.filter((d) => d !== day);
    set(
      'workDays',
      [...new Set(next)].sort((a, b) => a - b),
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  const noWorkDays = draft.workDays.length === 0;
  const hoursInverted = draft.workdayEndMinute <= draft.workdayStartMinute;
  const canSave = dirty && !noWorkDays && !hoursInverted && !invalidHours && knownZone;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!canSave) return;
    const input: UpdatePreferencesInput = {
      timeZone: draft.timeZone,
      workdayStartMinute: draft.workdayStartMinute,
      workdayEndMinute: draft.workdayEndMinute,
      workDays: draft.workDays,
      defaultFocusMinutes: draft.defaultFocusMinutes,
      minimumBufferMinutes: draft.minimumBufferMinutes,
      durationLearningEnabled: draft.durationLearningEnabled,
    };
    save.mutate(input);
  }

  const detected = detectedZone();

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-[13px] text-primary">Time zone</span>
          {/* A text field with suggestions rather than a select: typing "Tall" gets you there,
              scrolling from Africa/Abidjan does not. The list is the browser's own, so what is
              offered is exactly what this server will accept. */}
          <Input
            list="scalar-time-zones"
            value={draft.timeZone}
            invalid={!knownZone}
            spellCheck={false}
            autoComplete="off"
            placeholder="Start typing a city or region"
            aria-describedby="scalar-time-zone-hint"
            onChange={(event) => {
              set('timeZone', event.target.value);
            }}
          />
          <datalist id="scalar-time-zones">
            {zones.map(({ zone, offset }) => (
              <option key={zone} value={zone} label={offset ? `${zone} · ${offset}` : zone} />
            ))}
          </datalist>
          {!knownZone ? (
            <span className="text-[12px] text-danger" role="alert">
              That is not a time zone this server knows. Pick one from the list.
            </span>
          ) : null}
          {draft.timeZone !== detected ? (
            <span id="scalar-time-zone-hint" className="text-[12px] text-muted">
              This device is in {detected}.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  set('timeZone', detected);
                }}
              >
                Use it
              </button>
            </span>
          ) : null}
        </label>

        <fieldset className="grid gap-1.5">
          <legend className="text-[13px] text-primary">Working hours</legend>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              size="sm"
              aria-label="Working day starts"
              value={toTimeValue(draft.workdayStartMinute)}
              invalid={hoursInverted}
              onChange={(event) => {
                const minutes = fromTimeValue(event.target.value);
                setInvalidHours(minutes === null);
                if (minutes !== null) set('workdayStartMinute', minutes);
              }}
            />
            <span className="text-[13px] text-secondary">to</span>
            <Input
              type="time"
              size="sm"
              aria-label="Working day ends"
              value={toTimeValue(draft.workdayEndMinute)}
              invalid={hoursInverted}
              onChange={(event) => {
                const minutes = fromTimeValue(event.target.value);
                setInvalidHours(minutes === null);
                if (minutes !== null) set('workdayEndMinute', minutes);
              }}
            />
          </div>
          {hoursInverted ? (
            <span className="text-[12px] text-danger" role="alert">
              The working day has to end after it starts.
            </span>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-1.5">
          <legend className="text-[13px] text-primary">Working days</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {WEEKDAYS.map((day) => (
              <Checkbox
                key={day.value}
                label={day.label}
                checked={draft.workDays.includes(day.value)}
                onChange={(event) => {
                  toggleDay(day.value, event.target.checked);
                }}
              />
            ))}
          </div>
          {noWorkDays ? (
            <span className="text-[12px] text-danger" role="alert">
              Pick at least one day.
            </span>
          ) : null}
        </fieldset>

        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1.5">
            <span className="text-[13px] text-primary">Default focus length</span>
            <Input
              type="number"
              size="sm"
              min={5}
              max={480}
              step={5}
              className="w-24"
              value={draft.defaultFocusMinutes}
              onChange={(event) => {
                set('defaultFocusMinutes', Number(event.target.value));
              }}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] text-primary">Buffer between blocks</span>
            <Input
              type="number"
              size="sm"
              min={0}
              max={120}
              step={5}
              className="w-24"
              value={draft.minimumBufferMinutes}
              onChange={(event) => {
                set('minimumBufferMinutes', Number(event.target.value));
              }}
            />
          </label>
        </div>

        <Checkbox
          label="Learn from finished focus sessions"
          description="Scalar may use how long work actually took to improve future estimates. Turning this off keeps the sessions as your own history and draws nothing from them."
          checked={draft.durationLearningEnabled}
          onChange={(event) => {
            set('durationLearningEnabled', event.target.checked);
          }}
        />
      </div>

      {save.isError ? (
        <div className="mt-4">
          <ErrorNotice title="Those preferences could not be saved." />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!canSave} loading={save.isPending}>
          Save
        </Button>
        {!dirty && save.isSuccess ? (
          <span className="text-[12px] text-secondary" role="status">
            Saved.
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function PlanningSettings() {
  const preferences = usePreferences();

  return (
    <Panel title="Planning">
      {preferences.isPending ? (
        <div className="flex items-center gap-2 text-[13px] text-secondary">
          <Spinner /> Loading your preferences…
        </div>
      ) : preferences.isError ? (
        <ErrorNotice
          title="Your preferences could not be loaded."
          onRetry={() => void preferences.refetch()}
        />
      ) : (
        <PlanningForm preferences={preferences.data} />
      )}
    </Panel>
  );
}

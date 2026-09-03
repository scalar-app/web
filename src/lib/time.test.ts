import { describe, expect, it } from 'vitest';
import { describeWhen } from './time';

describe('describeWhen', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('says just now for the last minute', () => {
    expect(describeWhen(ago(0), now)).toBe('Just now');
    expect(describeWhen(ago(59_000), now)).toBe('Just now');
  });

  /** A client clock a few seconds behind the server must not produce "in 3 seconds". */
  it('says just now for a timestamp slightly in the future', () => {
    expect(describeWhen(new Date(now.getTime() + 3000).toISOString(), now)).toBe('Just now');
  });

  it('counts minutes and hours, and gets the singular right', () => {
    expect(describeWhen(ago(60_000), now)).toBe('1 minute ago');
    expect(describeWhen(ago(12 * 60_000), now)).toBe('12 minutes ago');
    expect(describeWhen(ago(60 * 60_000), now)).toBe('1 hour ago');
    expect(describeWhen(ago(4 * 60 * 60_000), now)).toBe('4 hours ago');
  });

  /** Past a day the date is the more useful fact: "73 hours ago" is arithmetic homework. */
  it('switches to a date after a day', () => {
    expect(describeWhen(ago(25 * 60 * 60_000), now)).not.toContain('ago');
    expect(describeWhen(ago(3 * 24 * 60 * 60_000), now)).not.toContain('ago');
  });
});

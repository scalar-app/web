import { describeDue, startOfWeek, toDateKey } from './time';

describe('time helpers', () => {
  it('starts weeks on Monday', () => {
    const wed = new Date(2026, 7, 19, 15, 0);
    const monday = startOfWeek(wed);
    expect(monday.getDay()).toBe(1);
    expect(toDateKey(monday)).toBe('2026-08-17');
    const sunday = new Date(2026, 7, 23, 9, 0);
    expect(toDateKey(startOfWeek(sunday))).toBe('2026-08-17');
  });

  it('describes due dates relative to now', () => {
    const now = new Date(2026, 7, 18, 12, 0);
    expect(describeDue(null, now)).toBeNull();
    expect(describeDue(new Date(2026, 7, 17, 9).toISOString(), now)?.label).toBe('Overdue');
    expect(describeDue(new Date(2026, 7, 18, 18).toISOString(), now)?.tone).toBe('yellow');
    expect(describeDue(new Date(2026, 7, 19, 9).toISOString(), now)?.label).toMatch(/^Tomorrow/);
    expect(describeDue(new Date(2026, 7, 25, 9).toISOString(), now)?.tone).toBe('neutral');
  });
});

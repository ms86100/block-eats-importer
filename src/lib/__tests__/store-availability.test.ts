import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeStoreStatus, formatStoreClosedMessage, type StoreAvailability } from '../store-availability';

/* ── Helper: mock Date.now to a specific time ── */
function mockTime(dateStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateStr));
}

afterEach(() => {
  vi.useRealTimers();
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Part 1: computeStoreStatus
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
describe('computeStoreStatus', () => {
  // Test 1: Store paused (holiday/manual toggle)
  it('returns paused when isAvailable is false', () => {
    mockTime('2026-03-07T14:00:00'); // Saturday
    const result = computeStoreStatus('09:00', '21:00', ['Sat'], false);
    expect(result.status).toBe('paused');
    expect(result.nextOpenAt).toBeNull();
    expect(result.minutesUntilOpen).toBeNull();
  });

  // Test 2: No hours configured → always open
  it('returns open when no hours configured (null)', () => {
    mockTime('2026-03-07T04:00:00');
    const result = computeStoreStatus(null, null, null, true);
    expect(result.status).toBe('open');
    expect(result.minutesUntilOpen).toBe(0);
  });

  // Test 3: Currently within operating hours
  it('returns open when current time is within operating window', () => {
    mockTime('2026-03-07T14:00:00'); // Saturday 14:00
    const result = computeStoreStatus('09:00', '21:00', ['Sat'], true);
    expect(result.status).toBe('open');
    expect(result.minutesUntilOpen).toBe(0);
  });

  // Test 4: Before opening today
  it('returns closed with correct minutesUntilOpen when before opening', () => {
    mockTime('2026-03-07T04:00:00'); // Saturday 04:00
    const result = computeStoreStatus('09:00', '21:00', ['Sat'], true);
    expect(result.status).toBe('closed');
    expect(result.minutesUntilOpen).toBe(300); // 5 hours = 300 min
    expect(result.nextOpenAt).not.toBeNull();
  });

  // Test 5: After closing today
  it('returns closed with nextOpenAt tomorrow when after closing', () => {
    mockTime('2026-03-07T22:00:00'); // Saturday 22:00
    const result = computeStoreStatus('09:00', '21:00', ['Sat', 'Sun'], true);
    expect(result.status).toBe('closed');
    expect(result.nextOpenAt).not.toBeNull();
    // Should be tomorrow at 09:00
    const nextOpen = new Date(result.nextOpenAt!);
    expect(nextOpen.getHours()).toBe(9);
    expect(nextOpen.getMinutes()).toBe(0);
    expect(nextOpen.getDate()).toBe(8); // March 8
  });

  // Test 6: Closed today (wrong operating day)
  it('returns closed_today when current day is not in operating days', () => {
    // 2026-03-08 is a Sunday
    mockTime('2026-03-08T14:00:00');
    const result = computeStoreStatus('09:00', '21:00', ['Mon', 'Tue'], true);
    expect(result.status).toBe('closed_today');
    expect(result.minutesUntilOpen).toBeNull();
  });

  // Test 7: Empty operating days array → no restriction, check time
  it('returns open when operating days is empty array and within hours', () => {
    mockTime('2026-03-07T14:00:00');
    const result = computeStoreStatus('09:00', '21:00', [], true);
    expect(result.status).toBe('open');
  });

  // Test 8: Null operating days → no day restriction
  it('returns open when operating days is null and within hours', () => {
    mockTime('2026-03-07T14:00:00');
    const result = computeStoreStatus('09:00', '21:00', null, true);
    expect(result.status).toBe('open');
  });

  // Test 9: Exact opening minute → should be open
  it('returns open at exact opening minute', () => {
    mockTime('2026-03-07T09:00:00');
    const result = computeStoreStatus('09:00', '21:00', null, true);
    expect(result.status).toBe('open');
  });

  // Test 10: Exact closing minute → should be closed
  it('returns closed at exact closing minute', () => {
    mockTime('2026-03-07T21:00:00');
    const result = computeStoreStatus('09:00', '21:00', null, true);
    expect(result.status).toBe('closed');
  });

  /* ── Backward Compatibility ── */

  // Test 13: Seller with all undefined fields → open
  it('backward compat: undefined fields treated as always open', () => {
    mockTime('2026-03-07T04:00:00');
    const result = computeStoreStatus(undefined, undefined, undefined, true);
    expect(result.status).toBe('open');
  });

  // Test 14: Time format HH:MM:SS works same as HH:MM
  it('backward compat: HH:MM:SS time format works', () => {
    mockTime('2026-03-07T14:00:00');
    const result = computeStoreStatus('09:00:00', '21:00:00', null, true);
    expect(result.status).toBe('open');
  });

  it('backward compat: HH:MM:SS before opening works', () => {
    mockTime('2026-03-07T04:00:00');
    const result = computeStoreStatus('09:00:00', '21:00:00', null, true);
    expect(result.status).toBe('closed');
    expect(result.minutesUntilOpen).toBe(300);
  });

  // Test 15: isAvailable defaults — passing true explicitly
  it('backward compat: isAvailable=true with no hours → open', () => {
    mockTime('2026-03-07T04:00:00');
    const result = computeStoreStatus(null, null, null, true);
    expect(result.status).toBe('open');
  });

  // Test 16: Empty string for start/end treated like null
  it('backward compat: empty string times treated as no hours configured', () => {
    mockTime('2026-03-07T04:00:00');
    // Empty strings are falsy in JS so should hit the null check
    const result = computeStoreStatus('' as any, '' as any, null, true);
    expect(result.status).toBe('open');
  });
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Part 2: formatStoreClosedMessage
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
describe('formatStoreClosedMessage', () => {
  // Test 8: Paused
  it('returns "Store paused" for paused status', () => {
    const msg = formatStoreClosedMessage({ status: 'paused', nextOpenAt: null, minutesUntilOpen: null });
    expect(msg).toBe('Store paused');
  });

  // Test 9: Closed today
  it('returns "Closed today" for closed_today status', () => {
    const msg = formatStoreClosedMessage({ status: 'closed_today', nextOpenAt: null, minutesUntilOpen: null });
    expect(msg).toBe('Closed today');
  });

  // Test 10: Opens in <60 min
  it('returns "Opens in X min" when under 60 minutes', () => {
    const msg = formatStoreClosedMessage({ status: 'closed', nextOpenAt: null, minutesUntilOpen: 30 });
    expect(msg).toBe('Opens in 30 min');
  });

  // Test 11: Opens in 1-2 hrs
  it('returns "Opens in 1 hr" when 60-119 minutes', () => {
    const msg = formatStoreClosedMessage({ status: 'closed', nextOpenAt: null, minutesUntilOpen: 90 });
    expect(msg).toBe('Opens in 1 hr');
  });

  // Test 12: Opens at specific time
  it('returns "Opens at HH:MM" when >2 hrs and nextOpenAt provided', () => {
    const nextOpen = new Date('2026-03-07T09:00:00');
    const msg = formatStoreClosedMessage({
      status: 'closed',
      nextOpenAt: nextOpen.toISOString(),
      minutesUntilOpen: 300,
    });
    expect(msg).toMatch(/Opens at/);
  });

  // Open status → empty string
  it('returns empty string for open status', () => {
    const msg = formatStoreClosedMessage({ status: 'open', nextOpenAt: null, minutesUntilOpen: 0 });
    expect(msg).toBe('');
  });

  // Null minutes → fallback
  it('returns "Store closed" when minutes is null', () => {
    const msg = formatStoreClosedMessage({ status: 'closed', nextOpenAt: null, minutesUntilOpen: null });
    expect(msg).toBe('Store closed');
  });

  // >2 hrs without nextOpenAt → hours fallback
  it('returns "Opens in X hrs" when >2 hrs and no nextOpenAt', () => {
    const msg = formatStoreClosedMessage({ status: 'closed', nextOpenAt: null, minutesUntilOpen: 300 });
    expect(msg).toBe('Opens in 5 hrs');
  });
});

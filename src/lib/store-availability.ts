/**
 * Client-side mirror of the DB function `compute_store_status`.
 * This is used to avoid N+1 RPC calls — the logic is identical to the backend.
 * The DB function remains the source of truth for server-side use.
 */

export type StoreStatus = 'open' | 'closed' | 'closed_today' | 'paused';

export interface StoreAvailability {
  status: StoreStatus;
  nextOpenAt: string | null;
  minutesUntilOpen: number | null;
}

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function computeStoreStatus(
  availabilityStart: string | null | undefined,
  availabilityEnd: string | null | undefined,
  operatingDays: string[] | null | undefined,
  isAvailable: boolean
): StoreAvailability {
  // Manual pause/holiday
  if (!isAvailable) {
    return { status: 'paused', nextOpenAt: null, minutesUntilOpen: null };
  }

  // No hours configured = always open
  if (!availabilityStart || !availabilityEnd) {
    return { status: 'open', nextOpenAt: null, minutesUntilOpen: 0 };
  }

  const now = new Date();
  const currentDay = DAY_ABBREVS[now.getDay()];

  // Check operating day
  if (operatingDays && operatingDays.length > 0 && !operatingDays.includes(currentDay)) {
    return { status: 'closed_today', nextOpenAt: null, minutesUntilOpen: null };
  }

  // Parse time strings (HH:MM:SS or HH:MM)
  const [startH, startM] = availabilityStart.split(':').map(Number);
  const [endH, endM] = availabilityEnd.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return { status: 'open', nextOpenAt: null, minutesUntilOpen: 0 };
  }

  // Store is closed
  let minutesUntilOpen: number;
  const nextOpen = new Date(now);

  if (currentMinutes < startMinutes) {
    // Before opening today
    minutesUntilOpen = startMinutes - currentMinutes;
    nextOpen.setHours(startH, startM, 0, 0);
  } else {
    // Past closing, opens tomorrow
    minutesUntilOpen = (24 * 60 - currentMinutes) + startMinutes;
    nextOpen.setDate(nextOpen.getDate() + 1);
    nextOpen.setHours(startH, startM, 0, 0);
  }

  return {
    status: 'closed',
    nextOpenAt: nextOpen.toISOString(),
    minutesUntilOpen,
  };
}

/** Format a human-readable "opens at" message */
export function formatStoreClosedMessage(availability: StoreAvailability): string {
  if (availability.status === 'paused') return 'Store paused';
  if (availability.status === 'closed_today') return 'Closed today';
  if (availability.status !== 'closed') return '';

  const mins = availability.minutesUntilOpen;
  if (mins == null) return 'Store closed';

  if (mins < 60) return `Opens in ${mins} min`;
  if (mins < 120) return `Opens in 1 hr`;

  // Show "Opens at HH:MM AM/PM"
  if (availability.nextOpenAt) {
    const d = new Date(availability.nextOpenAt);
    return `Opens at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const hours = Math.round(mins / 60);
  return `Opens in ${hours} hrs`;
}

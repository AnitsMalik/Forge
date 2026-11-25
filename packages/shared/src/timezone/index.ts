/**
 * Timezone Engine for SocialForge
 *
 * Provides safe UTC normalization, IANA timezone conversions, daylight saving time (DST)
 * handling, and localized date/time formatting without heavy external dependencies.
 */

export interface TimezoneDetails {
  timeZone: string;
  offsetMinutes: number;
  offsetString: string;
  abbreviation: string;
  hasDST: boolean;
  isDST: boolean;
}

/**
 * Computes the UTC offset (in minutes) for an IANA timezone at a specific UTC timestamp.
 * Returns negative numbers for west of UTC (e.g. -240 for EDT, -300 for EST)
 * and positive numbers for east of UTC (e.g. +540 for JST, +330 for IST).
 */
export function getTimezoneOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const year = getPart('year');
    const month = getPart('month') - 1;
    const day = getPart('day');
    let hour = getPart('hour');
    if (hour === 24) hour = 0;
    const minute = getPart('minute');
    const second = getPart('second');

    const localTimeAsUtc = Date.UTC(year, month, day, hour, minute, second);
    const utcTime = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );

    return Math.round((localTimeAsUtc - utcTime) / 60000);
  } catch (err) {
    return 0; // Default to UTC if unknown
  }
}

/**
 * Converts a brand's local date and time string into a safe UTC ISO-8601 string.
 * Example: dateStr="2026-09-24", timeStr="09:00", timeZone="America/New_York" (EDT, UTC-4)
 * -> returns Date object representing 2026-09-24T13:00:00.000Z
 */
export function fromBrandLocal(
  dateStr: string,
  timeStr: string = '09:00',
  timeZone: string = 'Asia/Kolkata'
): Date {
  const [hours = '09', minutes = '00'] = timeStr.split(':');
  const approxUtc = new Date(`${dateStr}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`);

  if (isNaN(approxUtc.getTime())) {
    throw new Error(`Invalid date/time inputs: ${dateStr} ${timeStr}`);
  }

  // Calculate offset at approx date
  const offset1 = getTimezoneOffsetMinutes(timeZone, approxUtc);
  const corrected1 = new Date(approxUtc.getTime() - offset1 * 60000);

  // Second pass to resolve exact DST boundary transition
  const offset2 = getTimezoneOffsetMinutes(timeZone, corrected1);
  return new Date(approxUtc.getTime() - offset2 * 60000);
}

/**
 * Converts a UTC Date/timestamp into the brand's local date and time components.
 */
export function toBrandLocal(
  dateOrIso: Date | string,
  timeZone: string = 'Asia/Kolkata'
): { dateStr: string; timeStr: string; displayStr: string } {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) {
    return { dateStr: '', timeStr: '', displayStr: '' };
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  const displayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    dateStr,
    timeStr,
    displayStr: displayFormatter.format(date),
  };
}

/**
 * Inspects timezone metadata including DST status and current offset label.
 */
export function getTimezoneDetails(timeZone: string, date: Date = new Date()): TimezoneDetails {
  const tz = timeZone || 'Asia/Kolkata';
  const offsetMin = getTimezoneOffsetMinutes(tz, date);
  const sign = offsetMin >= 0 ? '+' : '-';
  const absHours = Math.floor(Math.abs(offsetMin) / 60);
  const absMin = Math.abs(offsetMin) % 60;
  const offsetString = `UTC${sign}${absHours}${absMin ? `:${absMin.toString().padStart(2, '0')}` : ''}`;

  let abbreviation = offsetString;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(date);
    abbreviation = parts.find((p) => p.type === 'timeZoneName')?.value || offsetString;
  } catch {
    // fallback
  }

  // DST check: compare offset in January vs July
  const janOffset = getTimezoneOffsetMinutes(tz, new Date(date.getFullYear(), 0, 1));
  const julOffset = getTimezoneOffsetMinutes(tz, new Date(date.getFullYear(), 6, 1));
  const hasDST = janOffset !== julOffset;
  // If current offset is the higher one in northern hemisphere or differs from standard time
  const standardOffset = Math.min(janOffset, julOffset);
  const isDST = hasDST && offsetMin !== standardOffset;

  return {
    timeZone: tz,
    offsetMinutes: offsetMin,
    offsetString,
    abbreviation,
    hasDST,
    isDST,
  };
}

/**
 * Formats a date into a localized string for a brand's timezone.
 */
export function formatInBrandTimezone(
  dateOrIso: Date | string,
  timeZone: string = 'Asia/Kolkata',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    ...options,
  }).format(date);
}

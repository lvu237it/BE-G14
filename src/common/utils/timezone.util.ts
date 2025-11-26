/**
 * Timezone Utility cho Việt Nam (UTC+7)
 */

const VIETNAM_TIMEZONE_OFFSET = 7; // UTC+7

/**
 * Convert UTC Date to Vietnam Timezone (UTC+7)
 * Returns a Date object representing the correct time in UTC+7
 * @param date - UTC Date
 * @returns Date adjusted to UTC+7
 */
export function toVietnamTime(
  date: Date | string | null | undefined,
): Date | null {
  if (!date) return null;

  const utcDate = new Date(date);
  if (isNaN(utcDate.getTime())) return null;

  // Create a new date in UTC+7 timezone
  // Get UTC offset in minutes (UTC+7 = -420 minutes from UTC perspective)
  const vietnamOffsetMs = VIETNAM_TIMEZONE_OFFSET * 60 * 60 * 1000;
  const localOffsetMs = utcDate.getTimezoneOffset() * 60 * 1000;

  // Adjust: (utcTime) - (current local offset) + (Vietnam offset)
  const vietnamTime = new Date(
    utcDate.getTime() - localOffsetMs + vietnamOffsetMs,
  );

  return vietnamTime;
}

/**
 * Format Date to Vietnam Timezone string (ISO-like format)
 * @param date - Date to format
 * @returns Formatted string in format: YYYY-MM-DD HH:mm:ss
 */
export function formatVietnamTime(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  const vietnamDate = toVietnamTime(date);
  if (!vietnamDate) return null;

  const year = vietnamDate.getUTCFullYear();
  const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
  const hours = String(vietnamDate.getUTCHours()).padStart(2, '0');
  const minutes = String(vietnamDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(vietnamDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format Date to ISO format in Vietnam Timezone
 * @param date - Date to format
 * @returns ISO string in UTC+7
 */
export function toISOVietnamTime(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  const vietnamDate = toVietnamTime(date);
  if (!vietnamDate) return null;

  return vietnamDate.toISOString().replace('Z', '+07:00');
}

/**
 * Convert object with Date fields to Vietnam timezone
 * Recursively converts all Date fields in an object
 * @param obj - Object to convert
 * @returns Object with dates converted to Vietnam timezone
 */
export function convertObjectToVietnamTime<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return toVietnamTime(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectToVietnamTime(item)) as T;
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value instanceof Date) {
          converted[key] = toVietnamTime(value);
        } else if (Array.isArray(value)) {
          converted[key] = value.map((item) =>
            convertObjectToVietnamTime(item),
          );
        } else if (typeof value === 'object' && value !== null) {
          converted[key] = convertObjectToVietnamTime(value);
        } else {
          converted[key] = value;
        }
      }
    }
    return converted as T;
  }

  return obj;
}

/**
 * Get current time in Vietnam timezone
 * @returns Current time i UTC+7
 */
export function getNowVietnamTime(): Date {
  const now = new Date();
  return toVietnamTime(now) || now;
}

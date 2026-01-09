/**
 * Time normalization utilities
 * Converts timetable times to seconds since midnight
 */

/**
 * Parse a time string (e.g., "8:17 AM", "8:17PM", "20:17") to seconds since midnight
 */
export function parseTime(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }

  const trimmed = timeStr.trim().toUpperCase();
  
  // Handle 24-hour format (HH:MM)
  const hour24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hour24Match) {
    const hours = parseInt(hour24Match[1], 10);
    const minutes = parseInt(hour24Match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 3600 + minutes * 60;
    }
    return null;
  }

  // Handle 12-hour format with AM/PM
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const meridiem = amPmMatch[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes >= 60) {
      return null;
    }

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 3600 + minutes * 60;
  }

  // Handle format without colon (e.g., "817AM")
  const compactMatch = trimmed.match(/^(\d{1,2})(\d{2})(AM|PM)$/);
  if (compactMatch) {
    let hours = parseInt(compactMatch[1], 10);
    const minutes = parseInt(compactMatch[2], 10);
    const meridiem = compactMatch[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes >= 60) {
      return null;
    }

    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 3600 + minutes * 60;
  }

  return null;
}

/**
 * Get current time in seconds since midnight (local time)
 */
export function getCurrentTimeSeconds(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

/**
 * Check if current day is weekday or weekend
 */
export function isWeekday(): boolean {
  const day = new Date().getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

/**
 * Handle overnight rollover: if time decreases, add 24 hours
 */
export function normalizeOvernightTimes(times: number[]): number[] {
  const normalized = [...times];
  
  for (let i = 1; i < normalized.length; i++) {
    // If time decreased significantly (more than 2 hours), it's likely overnight
    if (normalized[i] < normalized[i - 1] && (normalized[i - 1] - normalized[i]) > 7200) {
      normalized[i] += 86400; // Add 24 hours (86400 seconds)
    }
  }

  return normalized;
}

/**
 * Format seconds since midnight to readable time string
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor((seconds % 3600) / 60);
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
}


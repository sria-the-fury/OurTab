/**
 * Formats a date or ISO string into a locale-aware time string.
 * Uses the device's default locale and respects 12H/24H settings.
 */
export function formatTimeLocale(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formats a date or ISO string into a locale-aware date string.
 * Uses the device's default locale (e.g., DD/MM/YYYY or MM/DD/YYYY).
 */
export function formatDateLocale(date: Date | string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, options);
}

/**
 * Standardizes a HH:mm string (like 20:00) into a locale-aware time string.
 */
export function formatTimeStr(timeStr: string): string {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return formatTimeLocale(d);
}

/**
 * Combines date and time in a detailed locale-aware format.
 * Format: "MMM DD, h:mm:ss A" (e.g., "Feb 28, 9:26:38 PM")
 */
export function formatDetailedDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });
}

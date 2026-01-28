/**
 * Get current hour in EST (0-23)
 */
export function getESTHour(): number {
    const date = new Date()
    const estHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        hour12: false,
    }).format(date)
    return parseInt(estHour, 10)
}

/**
 * Get current date in EST (YYYY-MM-DD)
 */
export function getESTDateString(): string {
    const date = new Date()
    const estDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date)

    // Format: "MM/DD/YYYY" -> "YYYY-MM-DD"
    const [month, day, year] = estDate.split('/')
    return `${year}-${month}-${day}`
}

/**
 * Convert any date string/object to EST hour (0-23)
 */
export function getESTHourFromDate(dateInput: string | Date): number {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    const estHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        hour12: false,
    }).format(date)
    return parseInt(estHour, 10)
}

/**
 * Given an EST date string (YYYY-MM-DD), returns the UTC ISO strings
 * for the start (00:00:00) and end (23:59:59) of that day.
 */
export function getESTDayBoundariesInUTC(dateStr: string): { start: string, end: string } {
    try {
        if (!dateStr) throw new Error('Empty date string')

        // Create a midday date to detect the offset for that specific day (handles DST)
        const d = new Date(`${dateStr}T12:00:00Z`);
        if (isNaN(d.getTime())) throw new Error(`Invalid date string: ${dateStr}`)

        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            timeZoneName: 'shortOffset'
        }).formatToParts(d);

        // Find the offset part (e.g., "GMT-5", "GMT-4")
        const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-5'; // Default to GMT-5

        // Clean it to format suitable for Date constructor (-05:00, -04:00)
        let offset = offsetPart.replace('GMT', '').replace(/\u2212/g, '-');
        if (!offset.includes(':') && offset.length <= 3) {
            offset += ':00'; // Fix for "GMT-5" -> "-5:00"
        }

        const start = new Date(`${dateStr}T00:00:00${offset}`).toISOString();
        const end = new Date(`${dateStr}T23:59:59.999${offset}`).toISOString();

        return { start, end };
    } catch (error) {
        console.error('⚠️ Timezone Util Error:', error)
        // Fallback to standard offset (5 hours behind UTC)
        const start = `${dateStr}T05:00:00.000Z`
        const end = `${dateStr}T23:59:59.999Z` // This fallback is imperfect (UTC end), but prevents crash
        // Better fallback: 
        const d = new Date(dateStr)
        const nextDay = new Date(d)
        nextDay.setDate(d.getDate() + 1)
        return {
            start: new Date(`${dateStr}T05:00:00Z`).toISOString(), // Approx 5h offset
            end: new Date(`${nextDay.toISOString().split('T')[0]}T04:59:59.999Z`).toISOString()
        }
    }
}

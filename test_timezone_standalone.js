
function getESTDayBoundariesInUTC(dateStr) {
    // Create a midday date to detect the offset for that specific day (handles DST)
    const d = new Date(`${dateStr}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'shortOffset'
    }).formatToParts(d);

    // Find the offset part (e.g., "GMT-5", "GMT-4")
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-5'; // Default to GMT-5 if fail
    console.log("Offset Part:", offsetPart);

    // Clean it to format suitable for Date constructor (-05:00, -04:00)
    // Replace "GMT" with nothing
    // Replace unicode minus with regular minus
    let offset = offsetPart.replace('GMT', '').replace(/\u2212/g, '-');

    // If it's just "-5", append ":00"
    if (!offset.includes(':')) {
        offset += ':00';
    }

    console.log("Cleaned Offset:", offset);

    const startStr = `${dateStr}T00:00:00${offset}`;
    const endStr = `${dateStr}T23:59:59.999${offset}`;

    console.log("Start Str:", startStr);
    console.log("End Str:", endStr);

    const start = new Date(startStr).toISOString();
    const end = new Date(endStr).toISOString();

    return { start, end };
}

try {
    console.log("Testing 2026-01-28:");
    const result = getESTDayBoundariesInUTC('2026-01-28');
    console.log("Result:", JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error:", error);
}

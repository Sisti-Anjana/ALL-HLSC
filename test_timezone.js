
const { getESTDayBoundariesInUTC } = require('./server/src/utils/timezone.util');

try {
    console.log("Testing 2026-01-28:");
    const result = getESTDayBoundariesInUTC('2026-01-28');
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error:", error);
}

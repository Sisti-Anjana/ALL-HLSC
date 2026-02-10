const fs = require('fs');
const path = require('path');
const CSV_PATH = path.join(__dirname, '..', '..', 'all_issues_2025-11-01_to_2026-02-05.csv');

const content = fs.readFileSync(CSV_PATH, 'utf8');
if (content.includes('Mid Atlantic')) {
    console.log('✅ Found "Mid Atlantic" in CSV');
} else {
    console.log('❌ "Mid Atlantic" NOT found in CSV');
}
if (content.includes('Wattch-2')) {
    console.log('✅ Found "Wattch-2" in CSV');
}

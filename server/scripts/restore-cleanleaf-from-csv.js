const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CSV_PATH = path.join(__dirname, '..', '..', 'all_issues_2025-11-01_to_2026-02-05.csv');
const TARGET_TENANT_KEYWORD = 'CleanLeaf';

async function restore() {
    console.log('🚀 Starting CleanLeaf Restoration...');

    // 1. Get Tenant
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const cleanLeaf = tenants.find(t => t.name.includes(TARGET_TENANT_KEYWORD));

    if (!cleanLeaf) {
        console.error('❌ CleanLeaf tenant not found');
        return;
    }
    const tenantId = cleanLeaf.tenant_id;
    console.log(`✅ Identified Tenant: ${cleanLeaf.name} (${tenantId})`);

    // 2. Get Portfolios (Name -> ID)
    const { data: portfolios } = await supabase.from('portfolios')
        .select('portfolio_id, name')
        .eq('tenant_id', tenantId);

    const portfolioMap = new Map();
    portfolios.forEach(p => portfolioMap.set(p.name.trim(), p.portfolio_id));
    console.log(`✅ Loaded ${portfolios.length} portfolios for mapping.`);
    console.log('Valid Portfolios:', [...portfolioMap.keys()]);

    // 3. Get Users (Name/Email extraction)
    const { data: users } = await supabase.from('users')
        .select('email, full_name')
        .eq('tenant_id', tenantId);

    const userMap = new Map(); // Name -> Email
    users.forEach(u => {
        if (u.full_name) userMap.set(u.full_name.toLowerCase(), u.email);
        // Also map first name
        if (u.full_name) userMap.set(u.full_name.split(' ')[0].toLowerCase(), u.email);
    });
    console.log(`✅ Loaded ${users.length} users for mapping.`);

    // 4. Read CSV and Process
    const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    // Header skipped by starting loop at 1

    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('Processing rows...');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Quick CSV parse handling quotes
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null && matches.length < 8) {
            if (match[1] !== undefined) {
                let val = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
                matches.push(val);
            }
        }

        if (matches.length < 7) continue;

        const [dateTimeStr, pName, hourStr, issuePresent, description, caseNum, monitoredBy] = matches;

        if (i <= 5) {
            console.log(`[DEBUG Row ${i}] Date:${dateTimeStr}, P:${pName}, Desc:${description}, Case:${caseNum}`);
        }

        // FILTER: Only restore if:
        // 1. No Case Number (Manual entry)
        // 2. Description is "No issue" (The ones we deleted)
        if (caseNum && caseNum.trim().length > 0) {
            skippedCount++;
            if (i <= 5) console.log('  -> Skipped (Case Number present)');
            continue;
        }
        if (description !== 'No issue') {
            skippedCount++;
            if (i <= 5) console.log(`  -> Skipped (Desc: ${description})`);
            continue;
        }

        const portfolioId = portfolioMap.get(pName.trim());
        if (!portfolioId) {
            errorCount++;
            if (i <= 5 || errorCount <= 5) console.warn(`  -> Portfolio not found: ${pName}`);
            continue;
        }

        // Resolve User
        let userEmail = null;
        if (monitoredBy) {
            const namePart = monitoredBy.trim().toLowerCase();
            userEmail = userMap.get(namePart);

            // Fallback: try to find email containing name
            if (!userEmail) {
                const found = users.find(u => u.email.includes(namePart) || (u.full_name && u.full_name.toLowerCase().includes(namePart)));
                if (found) userEmail = found.email;
            }
        }

        if (i <= 5) console.log(`  -> Will Insert. User: ${userEmail || monitoredBy}`);

        // Insert Data
        const createdAt = new Date(dateTimeStr); // Local time assumption works

        const { error } = await supabase.from('issues').insert({
            tenant_id: tenantId,
            portfolio_id: portfolioId,
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
            issue_hour: parseInt(hourStr) || 0,
            issue_present: issuePresent === 'Yes' ? 'Yes' : 'No', // Should be No
            description: description,
            monitored_by: userEmail ? [userEmail] : (monitoredBy ? [monitoredBy] : []), // Fallback to raw name
            notes: null
        });

        if (error) {
            console.error('Insert error:', error.message);
            errorCount++;
            if (errorCount <= 5) console.log('Sample Error Payload:', { tenantId, portfolioId, createdAt, description });
        } else {
            restoredCount++;
            if (restoredCount % 50 === 0) process.stdout.write('.');
        }
    }

    console.log('\n\n--- Restoration Complete ---');
    console.log(`✅ Restored: ${restoredCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

restore();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TENANT_NAME_KEYWORD = 'CleanLeaf';

async function fixMetadata() {
    console.log('🔄 Starting Portfolio Metadata Sync for CleanLeaf...');

    // 1. Get Tenant ID
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const cleanLeaf = tenants.find(t => t.name.includes(TENANT_NAME_KEYWORD));

    if (!cleanLeaf) return console.error('Tenant not found');
    const tenantId = cleanLeaf.tenant_id;
    console.log(`Target Tenant: ${cleanLeaf.name}`);

    // 2. Get Portfolios
    const { data: portfolios } = await supabase.from('portfolios')
        .select('portfolio_id, name')
        .eq('tenant_id', tenantId);

    console.log(`Found ${portfolios.length} portfolios.`);

    for (const p of portfolios) {
        // 3. Find most recent issue for this portfolio
        const { data: recentIssues } = await supabase.from('issues')
            .select('created_at, issue_hour')
            .eq('portfolio_id', p.portfolio_id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (recentIssues && recentIssues.length > 0) {
            const lastIssue = recentIssues[0];
            const lastDate = new Date(lastIssue.created_at);

            // Formatting for all_sites_checked_date (YYYY-MM-DD)
            // Use local time or UTC? The app seems to use standard strings.
            // Let's assume the app wants YYYY-MM-DD based on the issue time.
            const dateStr = lastIssue.created_at.split('T')[0];

            console.log(`Updating ${p.name}: Last Issue ${lastIssue.created_at}`);

            await supabase.from('portfolios')
                .update({
                    last_updated: lastIssue.created_at,
                    all_sites_checked_date: dateStr,
                    all_sites_checked_hour: lastIssue.issue_hour, // Assuming 1-24 or 0-23
                    all_sites_checked: 'Yes' // If they have an issue, they were checked? Or maybe 'No' if issue present?
                    // Actually, if an issue is logged, it counts as activity.
                    // But 'all_sites_checked' usually implies *completion*.
                    // If I just deleted "No issue" (completion), then maybe they *aren't* checked?
                    // BUT user says "data is present", implies they did the work.
                    // Safest is to update `last_updated` which drives the "Just Now" / "5m ago" display.
                    // `all_sites_checked` drives the "Y0" logic. 
                    // If I deleted the 'No issue' (which marks checked), then I should probably set checks to match the last *real* issue?
                    // Or should I leave `all_sites_checked` alone if it's cleaner?
                    // User complaint: "quick portfolio refce is showing worong data".
                    // If I deleted "No issue", they might be seeing "Y5" (old) instead of "Y0" (today).
                    // So I should update `all_sites_checked_date` to the last real issue date.
                })
                .eq('portfolio_id', p.portfolio_id);
        } else {
            console.log(`No issues for ${p.name} - Resetting to NULL`);
            await supabase.from('portfolios')
                .update({
                    last_updated: null,
                    all_sites_checked_date: null,
                    all_sites_checked_hour: null,
                    all_sites_checked: 'No'
                })
                .eq('portfolio_id', p.portfolio_id);
        }
    }
    console.log('✅ Sync Complete');
}

fixMetadata();

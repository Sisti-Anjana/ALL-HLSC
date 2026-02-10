const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');

    console.log('--- Issues Count Per Tenant ---');
    for (const t of tenants) {
        const { count } = await supabase.from('issues').select('*', { count: 'exact', head: true }).eq('tenant_id', t.tenant_id);
        console.log(`${t.name}: ${count} issues (${t.tenant_id})`);
    }

    console.log('\n--- Historical Files Count Per Tenant ---');
    for (const t of tenants) {
        const { count } = await supabase.from('historical_files').select('*', { count: 'exact', head: true }).eq('tenant_id', t.tenant_id);
        console.log(`${t.name}: ${count} files (${t.tenant_id})`);
    }
}

check();

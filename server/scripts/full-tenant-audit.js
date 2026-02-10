const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');

    console.log('--- ALL TENANTS ---');
    for (const t of tenants) {
        const { count } = await supabase.from('issues')
            .select('issue_id', { count: 'exact', head: true })
            .eq('tenant_id', t.tenant_id);
        console.log(`${t.name}: ${t.tenant_id} (Issues: ${count})`);
    }
}

check();

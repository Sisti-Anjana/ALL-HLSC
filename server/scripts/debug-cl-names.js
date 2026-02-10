const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const cleanLeaf = tenants.find(t => t.name.includes('CleanLeaf'));

    if (!cleanLeaf) return console.log('CL not found');

    const { data: portfolios } = await supabase.from('portfolios')
        .select('name')
        .eq('tenant_id', cleanLeaf.tenant_id);

    console.log('--- DB NAMES ---');
    portfolios.forEach(p => console.log(`'${p.name}'`));
}

check();

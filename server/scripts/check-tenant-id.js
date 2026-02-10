const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const badId = '59dd1187-4f12-4e2d-b34f-6b153018d279';
    const goodId = '59dd1187-5712-4e2d-b34f-6b153018d279';

    const { data: bad } = await supabase.from('tenants').select('*').eq('tenant_id', badId);
    const { data: good } = await supabase.from('tenants').select('*').eq('tenant_id', goodId);

    console.log(`Checking ${badId}: Found ${bad.length}`);
    console.log(`Checking ${goodId}: Found ${good.length}`);

    if (good.length > 0) console.log(`Correct SS ID is likely ${goodId} (${good[0].name})`);
}

check();

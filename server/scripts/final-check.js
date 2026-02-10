const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function ck() {
    const { data: ts } = await supabase.from('tenants').select('tenant_id, name');
    const { data: ps } = await supabase.from('portfolios').select('portfolio_id, tenant_id');
    const cl = ts.find(t => t.name.includes('CleanLeaf')).tenant_id;
    const ss = ts.find(t => t.name.includes('Standard Solar')).tenant_id;
    const ssPortIds = ps.filter(p => p.tenant_id === ss).map(p => p.portfolio_id);
    const { count: tcl } = await supabase.from('issues').select('*', { count: 'exact', head: true }).eq('tenant_id', cl);
    const { count: css } = await supabase.from('issues').select('*', { count: 'exact', head: true }).eq('tenant_id', cl).in('portfolio_id', ssPortIds);
    console.log(`TOTAL:${tcl}|WITH_SS_PORT:${css}`);
}
ck();

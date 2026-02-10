const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const { data: portfolios } = await supabase.from('portfolios').select('portfolio_id, name, tenant_id');

    const cleanLeaf = tenants.find(t => t.name.includes('CleanLeaf'));
    const stdSolar = tenants.find(t => t.name.includes('Standard Solar'));

    const ssPortfolioIds = portfolios.filter(p => p.tenant_id === stdSolar.tenant_id).map(p => p.portfolio_id);
    const clPortfolioIds = portfolios.filter(p => p.tenant_id === cleanLeaf.tenant_id).map(p => p.portfolio_id);

    const { count: countSS } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .in('portfolio_id', ssPortfolioIds);

    const { count: countNoIssue } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .eq('description', 'No issue');

    const { count: totalCL } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id);

    console.log(`TOTAL_CLEANLEAF_ISSUES: ${totalCL}`);
    console.log(`CLEANLEAF_ISSUES_WITH_SS_PORTFOLIOS: ${countSS}`);
    console.log(`CLEANLEAF_ISSUES_WITH_NO_ISSUE_DESC: ${countNoIssue}`);
}

check();

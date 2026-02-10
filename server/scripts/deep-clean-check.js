const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const { data: portfolios } = await supabase.from('portfolios').select('portfolio_id, name, tenant_id');

    const cleanLeaf = tenants.find(t => t.name.includes('CleanLeaf'));
    const stdSolar = tenants.find(t => t.name.includes('Standard Solar'));

    if (!cleanLeaf || !stdSolar) {
        console.log('Tenants not found');
        return;
    }

    console.log(`CleanLeaf ID: ${cleanLeaf.tenant_id}`);
    console.log(`StdSolar ID: ${stdSolar.tenant_id}`);

    const ssPortfolioIds = portfolios.filter(p => p.tenant_id === stdSolar.tenant_id).map(p => p.portfolio_id);
    const clPortfolioIds = portfolios.filter(p => p.tenant_id === cleanLeaf.tenant_id).map(p => p.portfolio_id);

    console.log('Checking for CleanLeaf issues pointing to Standard Solar portfolios...');
    const { data: clIssuesWithSSPortfolios, count: countSS } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .in('portfolio_id', ssPortfolioIds);

    console.log(`Issues in CleanLeaf belonging to Standard Solar Portfolios: ${countSS}`);

    console.log('Checking for issues in CleanLeaf with "No issue" description...');
    const { count: countNoIssue } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .eq('description', 'No issue');

    console.log(`Issues in CleanLeaf with "No issue" description: ${countNoIssue}`);

    const { data: samples } = await supabase.from('issues')
        .select('description, created_at, portfolio_id')
        .eq('tenant_id', cleanLeaf.tenant_id)
        .limit(5);

    console.log('CleanLeaf Issue Samples (to see format):', JSON.stringify(samples, null, 2));
}

check();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const cleanLeaf = tenants.find(t => t.name.includes('CleanLeaf'));

    if (!cleanLeaf) {
        console.log('CleanLeaf not found');
        return;
    }

    const { count: total } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id);

    const { count: withCaseNotes } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .ilike('notes', 'Case #:%');

    const { count: highSeqId } = await supabase.from('issues')
        .select('issue_id', { count: 'exact', head: true })
        .eq('tenant_id', cleanLeaf.tenant_id)
        .gt('issue_hour', 23); // Some imports had bad hours?

    console.log(`Summary for CleanLeaf (${cleanLeaf.tenant_id}):`);
    console.log(`  Total Issues: ${total}`);
    console.log(`  Issues with "Case #:" notes: ${withCaseNotes}`);
}

check();

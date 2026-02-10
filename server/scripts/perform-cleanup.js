const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runCleanup() {
    console.log('🚀 Starting Safe Cleanup...');

    // 1. Get Tenant IDs
    const { data: tenants } = await supabase.from('tenants').select('tenant_id, name');
    const cleanLeafId = tenants.find(t => t.name.includes('CleanLeaf'))?.tenant_id;
    const stdSolarId = tenants.find(t => t.name.includes('Standard Solar'))?.tenant_id;

    if (!cleanLeafId || !stdSolarId) {
        console.error('❌ Could not find tenant IDs');
        process.exit(1);
    }

    console.log(`- CleanLeaf ID: ${cleanLeafId}`);
    console.log(`- Standard Solar ID: ${stdSolarId}`);

    // 2. CleanLeaf: Delete "No issue" imports
    console.log('\n🗑️  Cleaning CleanLeaf Imported Data...');
    const { count: deleteCount, error: deleteError } = await supabase
        .from('issues')
        .delete({ count: 'exact' })
        .eq('tenant_id', cleanLeafId)
        .eq('description', 'No issue'); // Precise target

    if (deleteError) console.error('Error deleting issues:', deleteError.message);
    else console.log(`✅ Deleted ${deleteCount} imported "No issue" records from CleanLeaf.`);

    // 3. Standard Solar: Reset Portfolios
    console.log('\n✨ Resetting Standard Solar Portfolios...');
    const { error: updateError } = await supabase
        .from('portfolios')
        .update({
            all_sites_checked_date: null,
            all_sites_checked_hour: null,
            all_sites_checked: 'No', // or null, depending on schema, usually 'No' is default
            last_updated: null
        })
        .eq('tenant_id', stdSolarId);

    if (updateError) console.error('Error resetting portfolios:', updateError.message);
    else console.log('✅ Standard Solar portfolios reset to fresh state.');

    // 4. Clear Historical Files
    console.log('\n📂 Clearing Historical Files...');
    const { error: fileError } = await supabase
        .from('historical_files')
        .delete()
        .neq('file_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (fileError) console.error('Error clearing files:', fileError.message);
    else console.log('✅ Historical files table cleared.');

    console.log('\n🎉 Cleanup Complete!');
}

runCleanup();

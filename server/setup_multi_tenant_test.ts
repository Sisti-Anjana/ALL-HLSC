
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    const email = 'test.user@multitenant.com';
    const password = 'Password@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('🔄 Setting up test users...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);

    // 1. Get two active tenants
    const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('tenant_id, name')
        .eq('status', 'active')
        .limit(2);

    if (tenantError || !tenants || tenants.length < 2) {
        console.error('❌ Need at least 2 active tenants to test.', tenantError);
        return;
    }

    const tenant1 = tenants[0];
    const tenant2 = tenants[1];
    console.log(`🏢 Using tenants: "${tenant1.name}" and "${tenant2.name}"`);

    // 2. Clean up existing users with this email (to ensure clean state)
    const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('email', email);

    if (deleteError) {
        console.error('⚠️ Could not clean up old users:', deleteError.message);
    }

    // 3. Create User in Tenant 1
    const { error: error1 } = await supabase
        .from('users')
        .insert({
            email: email,
            password_hash: hashedPassword,
            full_name: 'Test Account (Client 1)',
            role: 'user',
            tenant_id: tenant1.tenant_id,
            is_active: true
        });

    if (error1) {
        console.error('❌ Failed to create first user:', error1.message);
        return;
    }
    console.log(`✅ Created user in "${tenant1.name}"`);

    // 4. Create User in Tenant 2 (Same Email)
    const { error: error2 } = await supabase
        .from('users')
        .insert({
            email: email,
            password_hash: hashedPassword,
            full_name: 'Test Account (Client 2)',
            role: 'user',
            tenant_id: tenant2.tenant_id,
            is_active: true
        });

    if (error2) {
        console.error('❌ Failed to create second user:', error2.message);
        return;
    }
    console.log(`✅ Created user in "${tenant2.name}"`);

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('You can now log in with the credentials above to test the Client Selection Screen.');
}

setup();

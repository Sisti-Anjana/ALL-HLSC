
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const email = 'test_multi_tenant_' + Date.now() + '@test.com';

    console.log('Testing email:', email);

    // 1. Get two valid tenant IDs
    const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('tenant_id')
        .limit(2);

    if (tenantError || !tenants || tenants.length < 2) {
        console.error('Need at least 2 tenants to test.', tenantError);
        return;
    }

    const tenant1 = tenants[0].tenant_id;
    const tenant2 = tenants[1].tenant_id;
    console.log('Using tenants:', tenant1, tenant2);


    // 2. Create first user
    const { data: user1, error: error1 } = await supabase
        .from('users')
        .insert({
            email: email,
            password_hash: 'dummy_hash',
            full_name: 'Test Use 1',
            role: 'user',
            tenant_id: tenant1
        })
        .select();

    if (error1) {
        console.error('Failed to create first user:', error1);
        return;
    }
    console.log('Created first user success');

    // 3. Create second user same email, different tenant
    const { data: user2, error: error2 } = await supabase
        .from('users')
        .insert({
            email: email,
            password_hash: 'dummy_hash',
            full_name: 'Test Use 2',
            role: 'user',
            tenant_id: tenant2
        })
        .select();

    if (error2) {
        console.log('Second insert result:', error2.code, error2.message);
        if (error2.code === '23505') {
            console.log('CONFIRMED: Unique constraint violation. Email must be globally unique.');
        } else {
            console.log('Other error:', error2);
        }
    } else {
        console.log('SUCCESS! Created second user with same email in different tenant!');
    }
}

verify();

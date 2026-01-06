
import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/database.config';

async function main() {
    console.log('Checking user p@amgsol.com...');
    const { data, error } = await supabase
        .from('users')
        .select('user_id, email, role, is_active, tenant_id, password_hash')
        .ilike('email', 'p@amgsol.com');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User found:', JSON.stringify(data, null, 2));
    }
}

main().catch(console.error);

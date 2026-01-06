
import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/database.config';
import { hashPassword } from './src/utils/password.util';

async function main() {
    const email = 'p@amgsol.com';
    const newPassword = 'password123';

    console.log(`Resetting password for ${email} to '${newPassword}'...`);

    try {
        const passwordHash = await hashPassword(newPassword);

        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .ilike('email', email)
            .select();

        if (error) {
            console.error('❌ Error updating password:', error);
        } else if (data && data.length > 0) {
            console.log('✅ Password updated successfully for:', data[0].email);
        } else {
            console.log('❌ User not found to update.');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

main().catch(console.error);

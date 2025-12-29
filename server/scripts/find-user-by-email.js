/**
 * Find User by Email (case-insensitive search)
 * Usage: node scripts/find-user-by-email.js
 */

require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findUser() {
  const searchEmail = 'ShreeY@amgsol.com'

  console.log('\n🔍 Searching for user with email:', searchEmail)
  console.log('═'.repeat(60))

  try {
    // Try exact match
    console.log('\n📋 Trying exact match...')
    const { data: exactMatch, error: exactError } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active, tenant_id')
      .eq('email', searchEmail)
      .limit(5)

    if (exactError) {
      console.error('❌ Error:', exactError.message)
    } else if (exactMatch && exactMatch.length > 0) {
      console.log('✅ Found', exactMatch.length, 'user(s) with exact match:')
      exactMatch.forEach((user, i) => {
        console.log(`\n   User ${i + 1}:`)
        console.log('      Email:', user.email)
        console.log('      Full Name:', user.full_name)
        console.log('      Role:', user.role)
        console.log('      Active:', user.is_active)
        console.log('      Tenant ID:', user.tenant_id)
      })
    } else {
      console.log('   No exact match found')
    }

    // Try lowercase match
    console.log('\n📋 Trying lowercase match...')
    const { data: lowerMatch, error: lowerError } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active, tenant_id')
      .eq('email', searchEmail.toLowerCase())
      .limit(5)

    if (lowerError) {
      console.error('❌ Error:', lowerError.message)
    } else if (lowerMatch && lowerMatch.length > 0) {
      console.log('✅ Found', lowerMatch.length, 'user(s) with lowercase match:')
      lowerMatch.forEach((user, i) => {
        console.log(`\n   User ${i + 1}:`)
        console.log('      Email:', user.email)
        console.log('      Full Name:', user.full_name)
        console.log('      Role:', user.role)
        console.log('      Active:', user.is_active)
        console.log('      Tenant ID:', user.tenant_id)
      })
    } else {
      console.log('   No lowercase match found')
    }

    // Search for all users with "shree" or "amgsol" in email
    console.log('\n📋 Searching for users with "shree" or "amgsol" in email...')
    const { data: partialMatch, error: partialError } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active, tenant_id')
      .or('email.ilike.%shree%,email.ilike.%amgsol%')
      .limit(10)

    if (partialError) {
      console.error('❌ Error:', partialError.message)
    } else if (partialMatch && partialMatch.length > 0) {
      console.log('✅ Found', partialMatch.length, 'user(s) with partial match:')
      partialMatch.forEach((user, i) => {
        console.log(`\n   User ${i + 1}:`)
        console.log('      Email:', user.email)
        console.log('      Full Name:', user.full_name)
        console.log('      Role:', user.role)
        console.log('      Active:', user.is_active)
        console.log('      Tenant ID:', user.tenant_id)
      })
    } else {
      console.log('   No partial match found')
    }

    // List all super_admin users
    console.log('\n📋 Listing all super_admin users...')
    const { data: superAdmins, error: superError } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, is_active, tenant_id')
      .eq('role', 'super_admin')
      .limit(10)

    if (superError) {
      console.error('❌ Error:', superError.message)
    } else if (superAdmins && superAdmins.length > 0) {
      console.log('✅ Found', superAdmins.length, 'super_admin user(s):')
      superAdmins.forEach((user, i) => {
        console.log(`\n   User ${i + 1}:`)
        console.log('      Email:', user.email)
        console.log('      Full Name:', user.full_name)
        console.log('      Role:', user.role)
        console.log('      Active:', user.is_active)
        console.log('      Tenant ID:', user.tenant_id)
      })
    } else {
      console.log('   No super_admin users found')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }

  console.log('\n' + '═'.repeat(60))
  console.log()
}

findUser()


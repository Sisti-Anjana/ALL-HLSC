/**
 * Direct Login Test Script
 * This tests the login process directly with the database
 * Usage: node scripts/test-login-direct.js
 */

require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcrypt')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
  const email = 'ShreeY@amgsol.com'
  const password = 'Shree@2025Y'
  const expectedHash = '$2b$10$AXgN3QhN/FlkHhw7kIRtROReHJklDCcIaqSErcqmA.5.QS63uWaAq'

  console.log('\n🔐 Testing Login Process')
  console.log('═'.repeat(60))
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('═'.repeat(60))

  try {
    // Step 1: Fetch user (case-insensitive)
    console.log('\n📋 Step 1: Fetching user from database...')
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('user_id, email, password_hash, full_name, role, tenant_id, is_active')
      .ilike('email', email)
      .limit(1)

    if (fetchError) {
      console.error('❌ Database error:', fetchError.message)
      return
    }

    if (!users || users.length === 0) {
      console.error('❌ User not found!')
      return
    }

    const user = users[0]
    console.log('✅ User found:')
    console.log('   Email:', user.email)
    console.log('   Role:', user.role)
    console.log('   Active:', user.is_active)
    console.log('   Tenant ID:', user.tenant_id)

    // Step 2: Check password hash
    console.log('\n🔑 Step 2: Checking password hash...')
    if (!user.password_hash) {
      console.error('❌ No password hash found!')
      return
    }

    console.log('   Hash length:', user.password_hash.length)
    console.log('   Hash starts with:', user.password_hash.substring(0, 7))
    console.log('   Expected hash:', expectedHash.substring(0, 30) + '...')
    console.log('   Actual hash:', user.password_hash.substring(0, 30) + '...')

    // Check if hash matches expected
    if (user.password_hash === expectedHash) {
      console.log('   ✅ Hash matches expected hash!')
    } else {
      console.log('   ⚠️  Hash does NOT match expected hash!')
      console.log('   This means the UPDATE query may not have run successfully.')
    }

    // Step 3: Compare password
    console.log('\n🔐 Step 3: Comparing password...')
    console.log('   Input password:', password)
    console.log('   Password length:', password.length)

    const isValid = await bcrypt.compare(password, user.password_hash)
    console.log('   Password match:', isValid ? '✅ YES' : '❌ NO')

    if (!isValid) {
      console.log('\n❌ PASSWORD COMPARISON FAILED!')
      console.log('\nPossible reasons:')
      console.log('1. The UPDATE query did not run successfully')
      console.log('2. The password hash in the database is incorrect')
      console.log('3. There are extra spaces or characters in the password')
      console.log('\nTry running this UPDATE query again in Supabase:')
      console.log(`UPDATE users SET password_hash = '${expectedHash}' WHERE email = '${email}';`)
    } else {
      console.log('\n✅ PASSWORD COMPARISON SUCCESSFUL!')
      console.log('The login should work. If it doesn\'t, check:')
      console.log('1. Backend server logs for other errors')
      console.log('2. User is_active status:', user.is_active)
      console.log('3. Tenant relationship exists')
    }

    // Step 4: Check tenant
    console.log('\n🏢 Step 4: Checking tenant...')
    if (user.tenant_id) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name, status')
        .eq('tenant_id', user.tenant_id)
        .single()

      if (tenantError) {
        console.log('   ⚠️  Tenant not found:', tenantError.message)
      } else {
        console.log('   ✅ Tenant found:')
        console.log('      Name:', tenant.name)
        console.log('      Status:', tenant.status)
      }
    } else {
      console.log('   ❌ No tenant_id found!')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }

  console.log('\n' + '═'.repeat(60))
  console.log()
}

testLogin()


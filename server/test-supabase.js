// Quick test script to verify Supabase connection
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

console.log('Testing Supabase connection...')
console.log('URL:', url)
console.log('Key length:', key?.length)
console.log('Key starts with:', key?.substring(0, 30))

if (!url || !key) {
  console.error('❌ Missing credentials!')
  process.exit(1)
}

const supabase = createClient(url, key)

// Test query
supabase
  .from('users')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection failed!')
      console.error('Error:', error.message)
      console.error('Code:', error.code)
      console.error('Details:', error.details)
      process.exit(1)
    } else {
      console.log('✅ Supabase connection successful!')
      process.exit(0)
    }
  })
  .catch(err => {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  })


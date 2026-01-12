import { createClient } from '@supabase/supabase-js'
import { config } from './constants'

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Supabase credentials are missing!')
  console.error('Please check your .env file in the server directory.')
  console.error('Required variables:')
  console.error('  - SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_KEY')
  console.error('Current values:')
  console.error('  - SUPABASE_URL:', config.SUPABASE_URL || '(empty)')
  console.error('  - SUPABASE_SERVICE_KEY:', config.SUPABASE_SERVICE_KEY ? `${config.SUPABASE_SERVICE_KEY.substring(0, 20)}...` : '(empty)')
  process.exit(1)
}

if (config.SUPABASE_URL === 'your_supabase_project_url' || config.SUPABASE_SERVICE_KEY === 'your_supabase_service_role_key') {
  console.error('❌ ERROR: Supabase credentials are not configured!')
  console.error('Please update your .env file with actual Supabase credentials.')
  console.error('Get your credentials from: https://app.supabase.com/project/_/settings/api')
  process.exit(1)
}

// Validate URL format
if (!config.SUPABASE_URL.startsWith('https://') || !config.SUPABASE_URL.includes('.supabase.co')) {
  console.error('❌ ERROR: Invalid SUPABASE_URL format!')
  console.error('Expected format: https://your-project-id.supabase.co')
  console.error('Current value:', config.SUPABASE_URL)
  process.exit(1)
}

// Validate service key format (should be a JWT)
if (!config.SUPABASE_SERVICE_KEY.startsWith('eyJ')) {
  console.error('❌ ERROR: Invalid SUPABASE_SERVICE_KEY format!')
  console.error('Service key should be a JWT token starting with "eyJ"')
  console.error('Current value starts with:', config.SUPABASE_SERVICE_KEY.substring(0, 10))
  process.exit(1)
}

console.log('✅ Supabase client initializing...')
console.log('   URL:', config.SUPABASE_URL)
console.log('   Service Key:', config.SUPABASE_SERVICE_KEY.substring(0, 30) + '...')

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: require('node-fetch'),
  },
})

console.log('✅ Supabase client created successfully')


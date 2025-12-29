import dotenv from 'dotenv'
import path from 'path'

// Load .env file from the server root directory (process.cwd() should be the server directory)
const envPath = path.resolve(process.cwd(), '.env')
console.log('📁 Loading .env from:', envPath)
console.log('📁 Current working directory:', process.cwd())

// Override existing environment variables with .env file values
const result = dotenv.config({ path: envPath, override: true })

if (result.error) {
  console.error('❌ Error loading .env:', result.error.message)
  console.error('   Attempted path:', envPath)
  // Fallback: try loading from default location
  console.log('   Trying default location...')
  const fallbackResult = dotenv.config({ override: true })
  if (fallbackResult.error) {
    console.error('❌ Fallback also failed:', fallbackResult.error.message)
  } else {
    console.log('✅ Loaded from default location')
  }
} else {
  console.log('✅ .env file loaded successfully (overriding system env vars)')
}

// Debug: Log if env vars are loaded (without exposing sensitive values)
if (process.env.SUPABASE_URL) {
  console.log('✅ Supabase URL loaded:', process.env.SUPABASE_URL.substring(0, 30) + '...')
} else {
  console.error('❌ SUPABASE_URL not found in environment variables')
}

if (process.env.SUPABASE_SERVICE_KEY) {
  const keyPreview = process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...'
  console.log('✅ Supabase Service Key loaded:', keyPreview)
} else {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment variables')
}

if (!process.env.PORT) {
  process.env.PORT = '5000'
}

export {}


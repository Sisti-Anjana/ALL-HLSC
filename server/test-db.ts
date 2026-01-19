import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

console.log('Testing Supabase Connection...')
console.log('URL:', url)
console.log('Key length:', key?.length)

if (!url || !key) {
    console.error('Missing credentials!')
    process.exit(1)
}

const supabase = createClient(url, key, {
    auth: { persistSession: false }
})

async function test() {
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
        if (error) {
            console.error('Supabase Error:', error)
        } else {
            console.log('Success! Connection working. Count:', data)
        }
    } catch (err) {
        console.error('Fetch Error:', err)
    }
}

test()

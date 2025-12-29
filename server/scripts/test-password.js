/**
 * Test password hash comparison
 * Usage: node test-password.js <hash> <password>
 * Example: node test-password.js '$2b$10$AXgN3QhN/FlkHhw7kIRtROReHJklDCcIaqSErcqmA.5.QS63uWaAq' 'Shree@2025Y'
 */

const bcrypt = require('bcrypt')

const hash = process.argv[2]
const password = process.argv[3]

if (!hash || !password) {
  console.error('❌ Error: Please provide hash and password')
  console.log('Usage: node test-password.js <hash> <password>')
  process.exit(1)
}

console.log('\n🔐 Testing Password Hash Comparison:')
console.log('─'.repeat(60))
console.log('Hash:', hash.substring(0, 30) + '...')
console.log('Password:', password)
console.log('─'.repeat(60))

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('❌ Error comparing:', err.message)
    process.exit(1)
  }
  
  if (result) {
    console.log('✅ Password matches!')
  } else {
    console.log('❌ Password does NOT match!')
    console.log('\n⚠️  The hash and password do not match.')
    console.log('   Make sure you generated the hash for the correct password.')
  }
  console.log('─'.repeat(60))
  console.log()
})


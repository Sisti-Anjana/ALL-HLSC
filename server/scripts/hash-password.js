/**
 * Helper script to hash passwords for creating users
 * Usage: node hash-password.js <password>
 * Example: node hash-password.js mypassword123
 */

const bcrypt = require('bcrypt')

const password = process.argv[2]

if (!password) {
  console.error('❌ Error: Please provide a password')
  console.log('Usage: node hash-password.js <password>')
  console.log('Example: node hash-password.js mypassword123')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)

console.log('\n✅ Password Hash Generated:')
console.log('─'.repeat(60))
console.log(hash)
console.log('─'.repeat(60))
console.log('\n📋 Copy this hash and use it in your SQL INSERT statement\n')




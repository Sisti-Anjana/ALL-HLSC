import './config/env'
import app from './app'
import { config } from './config/constants'

const PORT = Number(config.PORT) || 5000

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📝 Environment: ${config.NODE_ENV}`)
  console.log('🔄 Server restarted at', new Date().toISOString())
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`)
    process.exit(1)
  } else {
    throw error
  }
})


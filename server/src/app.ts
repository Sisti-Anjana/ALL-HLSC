import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.middleware'
import { loggerMiddleware } from './middleware/logger.middleware'
import routes from './routes'

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true)
      }
      callback(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware
app.use(loggerMiddleware)

// API routes
app.use('/api', routes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Debug endpoint to check Supabase config (remove in production)
app.get('/api/debug/config', (req, res) => {
  const { config } = require('./config/constants')
  res.json({
    hasUrl: !!config.SUPABASE_URL,
    urlPreview: config.SUPABASE_URL ? config.SUPABASE_URL.substring(0, 30) + '...' : 'missing',
    hasKey: !!config.SUPABASE_SERVICE_KEY,
    keyPreview: config.SUPABASE_SERVICE_KEY ? config.SUPABASE_SERVICE_KEY.substring(0, 30) + '...' : 'missing',
    keyLength: config.SUPABASE_SERVICE_KEY?.length || 0,
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

export default app


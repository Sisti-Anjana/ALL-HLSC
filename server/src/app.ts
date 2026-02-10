// Server Entry Point - Force Restart 938
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

// Debug logger for status codes
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`)
  })
  next()
})

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

// Debug endpoint to check connectivity
app.get('/api/debug/connectivity', async (req, res) => {
  const { config } = require('./config/constants')
  const results: any = {}

  try {
    const google = await fetch('https://www.google.com', { method: 'HEAD' })
    results.google = { ok: google.ok, status: google.status }
  } catch (e: any) {
    results.google = { error: e.message }
  }

  try {
    if (config.SUPABASE_URL) {
      // 1. Try raw fetch
      const supabase = await fetch(config.SUPABASE_URL, {
        method: 'GET',
        headers: { 'apikey': config.SUPABASE_SERVICE_KEY }
      })
      results.supabaseRaw = { ok: supabase.ok, status: supabase.status }

      // 2. Try Supabase Client
      const { supabase: supabaseClient } = require('./config/database.config')
      const { data, error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true })
      if (error) {
        results.supabaseClient = { success: false, error: error.message, details: error }
      } else {
        results.supabaseClient = { success: true, count: data }
      }
    } else {
      results.supabase = 'No URL configured'
    }
  } catch (e: any) {
    results.supabase = { error: e.message, cause: e.cause }
  }

  res.json({ results })
})

// Error handling middleware (must be last)
app.use(errorHandler)

export default app


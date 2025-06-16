import express from 'express'
import { registerRoutes } from './routes.js'
import { serveStatic, log } from './static.js'

// Create Express application
const app = express()

// Middleware for parsing JSON and form data
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Logger middleware for API calls
app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse = undefined

  // Intercept JSON responses to log them
  const originalResJson = res.json
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson
    return originalResJson.apply(res, [bodyJson, ...args])
  }

  // Log API calls on completion
  res.on('finish', () => {
    const duration = Date.now() - start
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…'
      }

      log(logLine)
    }
  })

  next()
})

// Start server
;(async () => {
  // Register API routes and get HTTP server
  const server = await registerRoutes(app)

  // Error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    res.status(status).json({ message })
  })

  // Serve static files last (catch-all route)
  serveStatic(app)

  // Listen on port 3000
  const port = 3000
  server.listen(port, () => {
    log(`Server running at http://localhost:${port}`)
  })
})()
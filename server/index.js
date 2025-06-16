import express from 'express'
import { registerRoutes } from './routes.js'
import { serveStatic, log } from './static.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse = undefined

  const originalResJson = res.json
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson
    return originalResJson.apply(res, [bodyJson, ...args])
  }

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
;(async () => {
  const server = await registerRoutes(app)

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500
    const message = err.message || 'Internal Server Error'

    res.status(status).json({ message })
    throw err
  })

  // Serve static files after setting up all other routes
  // so the catch-all route doesn't interfere with API routes
  serveStatic(app)

  const port = 3000
  server.listen(port, () => {
    log(`serving on port ${port}`)
  })
})()

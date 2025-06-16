import { createServer } from 'http'
import path from 'path'
import { apiConvert } from './api.js'

export async function registerRoutes(app) {
  // Serve the converter HTML file
  app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'))
  })

  app.get('/*', (req, res) => {
    res.redirect('/')
  })

  // API endpoint for conversion
  app.post('/api/convert', (req, res) => {
    try {
      return apiConvert(req, res)
    } catch (error) {
      res.status(500).json({
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  })

  const httpServer = createServer(app)
  return httpServer
}

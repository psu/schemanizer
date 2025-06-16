import express from 'express'
import fs from 'fs'
import path from 'path'

export function log(message, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  console.log(`${formattedTime} [${source}] ${message}`)
}

export function serveStatic(app) {
  const clientPath = path.resolve(import.meta.dirname, '..', 'client')

  // Serve static files from client directory
  app.use(express.static(clientPath))

  // Serve index.html for any unmatched routes
  app.use('*', (_req, res) => {
    res.sendFile(path.resolve(clientPath, 'index.html'))
  })
}
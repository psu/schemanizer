import { z } from 'zod'
import { zodToJsonSchema, jsonToZodSchema } from './convert.js'

export function apiConvert(req, res) {
  const { code, mode } = req.body

  if (!code || !code.trim()) {
    return res.status(400).json({ message: 'Code input is required' })
  }

  if (mode === 'zod') {
    // Convert Zod code to JSON Schema
    try {
      // Create a safe evaluation context
      const zodFunction = new Function('z', `return ${code}`)
      const zodSchema = zodFunction(z)

      const jsonSchema = zodToJsonSchema(zodSchema)

      res.json({ schema: jsonSchema })
    } catch (error) {
      res.status(400).json({
        message: `Invalid Zod schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  } else if (mode === 'json') {
    // Convert JSON to Zod schema
    try {
      const jsonData = JSON.parse(code)
      const zodCode = jsonToZodSchema(jsonData)

      res.json({ zodCode })
    } catch (error) {
      res.status(400).json({
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  } else {
    res.status(400).json({ message: 'Invalid mode. Use "zod" or "json"' })
  }
}

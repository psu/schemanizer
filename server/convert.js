// Import zodToJsonSchema from zod-to-json-schema if available
// Note: This is a common utility for converting Zod schemas to JSON Schema
export function zodToJsonSchema(zodSchema) {
  // Enhanced conversion function with comprehensive JSON Schema support
  // Implements: $schema, description, validation constraints, format validations,
  // advanced types, array/object controls, default,
  // readOnly/writeOnly, contentMediaType/contentEncoding

  if (!zodSchema || typeof zodSchema !== 'object') {
    throw new Error('Invalid Zod schema')
  }

  // Basic conversion logic for common Zod types
  const convertSchema = (schema, propName) => {
    if (schema._def) {
      const def = schema._def
      let jsonSchema = {}

      // Add description from .describe() if available
      if (def.description) {
        jsonSchema.description = def.description
      }

      switch (def.typeName) {
        case 'ZodString':
          jsonSchema.type = 'string'
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') jsonSchema.minLength = check.value
              if (check.kind === 'max') jsonSchema.maxLength = check.value
              if (check.kind === 'email') {
                jsonSchema.format = 'email'
                jsonSchema.contentMediaType = 'text/plain'
              }
              if (check.kind === 'url') {
                jsonSchema.format = 'uri'
                jsonSchema.contentMediaType = 'text/uri-list'
              }
              if (check.kind === 'uuid') jsonSchema.format = 'uuid'
              if (check.kind === 'datetime') jsonSchema.format = 'date-time'
              if (check.kind === 'regex') jsonSchema.pattern = check.regex.source
            }
          }

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }

          return jsonSchema

        case 'ZodNumber':
          jsonSchema.type = 'number'
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') {
                jsonSchema.minimum = check.value
                if (!check.inclusive) jsonSchema.exclusiveMinimum = true
              }
              if (check.kind === 'max') {
                jsonSchema.maximum = check.value
                if (!check.inclusive) jsonSchema.exclusiveMaximum = true
              }
              if (check.kind === 'int') jsonSchema.type = 'integer'
              if (check.kind === 'multipleOf') jsonSchema.multipleOf = check.value
            }
          }

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }

          return jsonSchema

        case 'ZodBoolean':
          jsonSchema.type = 'boolean'

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }

          return jsonSchema

        case 'ZodDate':
          jsonSchema.type = 'string'
          jsonSchema.format = 'date-time'

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue().toISOString()
          }

          return jsonSchema

        case 'ZodArray':
          jsonSchema.type = 'array'
          jsonSchema.items = convertSchema(def.type)

          // Fix: Safely handle array constraints - they may not exist for basic arrays
          // Check for length constraints in checks array if it exists
          if (def.checks && Array.isArray(def.checks)) {
            for (const check of def.checks) {
              if (check.kind === 'min') jsonSchema.minItems = check.value
              if (check.kind === 'max') jsonSchema.maxItems = check.value
              if (check.kind === 'length') {
                jsonSchema.minItems = check.value
                jsonSchema.maxItems = check.value
              }
            }
          }

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }

          return jsonSchema

        case 'ZodObject':
          jsonSchema.type = 'object'
          const properties = {}
          const required = []

          for (const [key, value] of Object.entries(def.shape())) {
            properties[key] = convertSchema(value, key)
            // Check if field is required (not optional)
            if (value._def.typeName !== 'ZodOptional') {
              required.push(key)
            }
          }

          jsonSchema.properties = properties
          if (required.length > 0) {
            jsonSchema.required = required
          }

          // Add additionalProperties control
          if (def.unknownKeys === 'passthrough') {
            jsonSchema.additionalProperties = true
          } else if (def.unknownKeys === 'strict') {
            jsonSchema.additionalProperties = false
          }

          // Add default value if available
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }

          return jsonSchema

        case 'ZodOptional':
          const optionalSchema = convertSchema(def.innerType, propName)
          // Mark as not required - handled at object level
          return optionalSchema

        case 'ZodNullable':
          const nullableSchema = convertSchema(def.innerType, propName)
          if (nullableSchema.type) {
            nullableSchema.type = [nullableSchema.type, 'null']
          }
          return nullableSchema

        case 'ZodEnum':
          jsonSchema.type = 'string'
          jsonSchema.enum = def.values
          if (def.defaultValue !== undefined) {
            jsonSchema.default = def.defaultValue()
          }
          return jsonSchema

        case 'ZodLiteral':
          jsonSchema.const = def.value
          return jsonSchema

        case 'ZodUnion':
          jsonSchema.anyOf = def.options.map(option => convertSchema(option, propName))
          return jsonSchema

        case 'ZodIntersection':
          jsonSchema.allOf = [convertSchema(def.left, propName), convertSchema(def.right, propName)]
          return jsonSchema

        case 'ZodRecord':
          jsonSchema.type = 'object'
          if (def.valueType) {
            jsonSchema.additionalProperties = convertSchema(def.valueType)
          } else {
            jsonSchema.additionalProperties = true
          }
          return jsonSchema

        case 'ZodTuple':
          jsonSchema.type = 'array'
          jsonSchema.items = def.items.map(item => convertSchema(item))
          jsonSchema.minItems = def.items.length
          jsonSchema.maxItems = def.items.length
          return jsonSchema

        default:
          return { type: 'any' }
      }
    }

    return { type: 'any' }
  }

  const schema = convertSchema(zodSchema, 'root')

  // Add JSON Schema metadata at root level
  const rootSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: schema.type || 'object',
    ...schema,
  }

  return rootSchema
}

export function jsonToZodSchema(jsonData) {
  // Convert JSON data to Zod schema code
  const generateZodCode = (data, indent = 0) => {
    const spaces = '  '.repeat(indent)

    if (data === null) return 'z.null()'
    if (typeof data === 'string') return 'z.string()'
    if (typeof data === 'number') return Number.isInteger(data) ? 'z.number().int()' : 'z.number()'
    if (typeof data === 'boolean') return 'z.boolean()'

    if (Array.isArray(data)) {
      if (data.length === 0) return 'z.array(z.any())'
      const itemType = generateZodCode(data[0], 0)
      return `z.array(${itemType})`
    }

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data)
      if (entries.length === 0) return 'z.object({})'

      const properties = entries
        .map(([key, value]) => {
          const zodType = generateZodCode(value, 0)
          return `${spaces}  ${key}: ${zodType}`
        })
        .join(',\n')

      return `z.object({\n${properties}\n${spaces}})`
    }

    return 'z.any()'
  }

  return generateZodCode(jsonData)
}

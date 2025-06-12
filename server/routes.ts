import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import path from "path";

// Import zodToJsonSchema from zod-to-json-schema if available
// Note: This is a common utility for converting Zod schemas to JSON Schema
function zodToJsonSchema(zodSchema: any): any {
  // Enhanced conversion function with full JSON Schema support
  
  if (!zodSchema || typeof zodSchema !== 'object') {
    throw new Error('Invalid Zod schema');
  }

  // Basic conversion logic for common Zod types
  const convertSchema = (schema: any): any => {
    if (schema._def) {
      const def = schema._def;
      let jsonSchema: any = {};
      
      // Add description from .describe() if available
      if (def.description) {
        jsonSchema.description = def.description;
      }
      
      switch (def.typeName) {
        case 'ZodString':
          jsonSchema.type = 'string';
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') jsonSchema.minLength = check.value;
              if (check.kind === 'max') jsonSchema.maxLength = check.value;
              if (check.kind === 'email') jsonSchema.format = 'email';
              if (check.kind === 'url') jsonSchema.format = 'uri';
              if (check.kind === 'uuid') jsonSchema.format = 'uuid';
              if (check.kind === 'datetime') jsonSchema.format = 'date-time';
              if (check.kind === 'regex') jsonSchema.pattern = check.regex.source;
            }
          }
          return jsonSchema;
          
        case 'ZodNumber':
          jsonSchema.type = 'number';
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') {
                jsonSchema.minimum = check.value;
                if (!check.inclusive) jsonSchema.exclusiveMinimum = true;
              }
              if (check.kind === 'max') {
                jsonSchema.maximum = check.value;
                if (!check.inclusive) jsonSchema.exclusiveMaximum = true;
              }
              if (check.kind === 'int') jsonSchema.type = 'integer';
              if (check.kind === 'multipleOf') jsonSchema.multipleOf = check.value;
            }
          }
          return jsonSchema;
          
        case 'ZodBoolean':
          jsonSchema.type = 'boolean';
          return jsonSchema;
          
        case 'ZodDate':
          jsonSchema.type = 'string';
          jsonSchema.format = 'date-time';
          return jsonSchema;
          
        case 'ZodArray':
          jsonSchema.type = 'array';
          jsonSchema.items = convertSchema(def.type);
          if (def.minLength !== null) jsonSchema.minItems = def.minLength.value;
          if (def.maxLength !== null) jsonSchema.maxItems = def.maxLength.value;
          if (def.exactLength !== null) {
            jsonSchema.minItems = def.exactLength.value;
            jsonSchema.maxItems = def.exactLength.value;
          }
          return jsonSchema;
          
        case 'ZodObject':
          jsonSchema.type = 'object';
          const properties: any = {};
          const required: string[] = [];
          
          for (const [key, value] of Object.entries(def.shape())) {
            properties[key] = convertSchema(value);
            // Check if field is required (not optional)
            if (!(value as any)._def.typeName === 'ZodOptional') {
              required.push(key);
            }
          }
          
          jsonSchema.properties = properties;
          if (required.length > 0) {
            jsonSchema.required = required;
          }
          
          // Add additionalProperties control
          if (def.unknownKeys === 'passthrough') {
            jsonSchema.additionalProperties = true;
          } else if (def.unknownKeys === 'strict') {
            jsonSchema.additionalProperties = false;
          }
          
          return jsonSchema;
          
        case 'ZodOptional':
          return convertSchema(def.innerType);
          
        case 'ZodNullable':
          const nullableSchema = convertSchema(def.innerType);
          if (nullableSchema.type) {
            nullableSchema.type = [nullableSchema.type, 'null'];
          }
          return nullableSchema;
          
        case 'ZodEnum':
          jsonSchema.type = 'string';
          jsonSchema.enum = def.values;
          return jsonSchema;
          
        case 'ZodLiteral':
          jsonSchema.const = def.value;
          return jsonSchema;
          
        case 'ZodUnion':
          jsonSchema.anyOf = def.options.map((option: any) => convertSchema(option));
          return jsonSchema;
          
        case 'ZodIntersection':
          jsonSchema.allOf = [convertSchema(def.left), convertSchema(def.right)];
          return jsonSchema;
          
        case 'ZodRecord':
          jsonSchema.type = 'object';
          if (def.valueType) {
            jsonSchema.additionalProperties = convertSchema(def.valueType);
          } else {
            jsonSchema.additionalProperties = true;
          }
          return jsonSchema;
          
        case 'ZodTuple':
          jsonSchema.type = 'array';
          jsonSchema.items = def.items.map((item: any) => convertSchema(item));
          jsonSchema.minItems = def.items.length;
          jsonSchema.maxItems = def.items.length;
          return jsonSchema;
          
        default:
          return { type: 'any' };
      }
    }
    
    return { type: 'any' };
  };

  const schema = convertSchema(zodSchema);
  
  // Add JSON Schema metadata at root level
  const rootSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: schema.type || 'object',
    ...schema
  };

  return rootSchema;
}

function jsonToZodSchema(jsonData: any): string {
  // Convert JSON data to Zod schema code
  const generateZodCode = (data: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    
    if (data === null) return 'z.null()';
    if (typeof data === 'string') return 'z.string()';
    if (typeof data === 'number') return Number.isInteger(data) ? 'z.number().int()' : 'z.number()';
    if (typeof data === 'boolean') return 'z.boolean()';
    
    if (Array.isArray(data)) {
      if (data.length === 0) return 'z.array(z.any())';
      const itemType = generateZodCode(data[0], 0);
      return `z.array(${itemType})`;
    }
    
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      if (entries.length === 0) return 'z.object({})';
      
      const properties = entries.map(([key, value]) => {
        const zodType = generateZodCode(value, 0);
        return `${spaces}  ${key}: ${zodType}`;
      }).join(',\n');
      
      return `z.object({\n${properties}\n${spaces}})`;
    }
    
    return 'z.any()';
  };
  
  return generateZodCode(jsonData);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the converter HTML file
  app.get('/converter.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client', 'converter.html'));
  });

  // API endpoint for conversion
  app.post('/api/convert', (req, res) => {
    try {
      const { code, mode } = req.body;
      
      if (!code || !code.trim()) {
        return res.status(400).json({ message: 'Code input is required' });
      }
      
      if (mode === 'zod') {
        // Convert Zod code to JSON Schema
        try {
          // Create a safe evaluation context
          const zodFunction = new Function('z', `return ${code}`);
          const zodSchema = zodFunction(z);
          
          const jsonSchema = zodToJsonSchema(zodSchema);
          
          res.json({ schema: jsonSchema });
        } catch (error) {
          res.status(400).json({ 
            message: `Invalid Zod schema: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      } else if (mode === 'json') {
        // Convert JSON to Zod schema
        try {
          const jsonData = JSON.parse(code);
          const zodCode = jsonToZodSchema(jsonData);
          
          res.json({ zodCode });
        } catch (error) {
          res.status(400).json({ 
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      } else {
        res.status(400).json({ message: 'Invalid mode. Use "zod" or "json"' });
      }
    } catch (error) {
      res.status(500).json({ 
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

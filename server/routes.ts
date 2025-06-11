import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import path from "path";

// Import zodToJsonSchema from zod-to-json-schema if available
// Note: This is a common utility for converting Zod schemas to JSON Schema
function zodToJsonSchema(zodSchema: any): any {
  // This is a simplified conversion function
  // In a real implementation, you would use a proper library like zod-to-json-schema
  
  if (!zodSchema || typeof zodSchema !== 'object') {
    throw new Error('Invalid Zod schema');
  }

  // Basic conversion logic for common Zod types
  const convertSchema = (schema: any): any => {
    if (schema._def) {
      const def = schema._def;
      
      switch (def.typeName) {
        case 'ZodString':
          const stringSchema: any = { type: 'string' };
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') stringSchema.minLength = check.value;
              if (check.kind === 'max') stringSchema.maxLength = check.value;
              if (check.kind === 'email') stringSchema.format = 'email';
              if (check.kind === 'url') stringSchema.format = 'uri';
            }
          }
          return stringSchema;
          
        case 'ZodNumber':
          const numberSchema: any = { type: 'number' };
          if (def.checks) {
            for (const check of def.checks) {
              if (check.kind === 'min') numberSchema.minimum = check.value;
              if (check.kind === 'max') numberSchema.maximum = check.value;
            }
          }
          return numberSchema;
          
        case 'ZodBoolean':
          return { type: 'boolean' };
          
        case 'ZodArray':
          return {
            type: 'array',
            items: convertSchema(def.type)
          };
          
        case 'ZodObject':
          const properties: any = {};
          const required: string[] = [];
          
          for (const [key, value] of Object.entries(def.shape())) {
            properties[key] = convertSchema(value);
            // Check if field is required (not optional)
            if (!(value as any)._def.typeName === 'ZodOptional') {
              required.push(key);
            }
          }
          
          const objectSchema: any = {
            type: 'object',
            properties
          };
          
          if (required.length > 0) {
            objectSchema.required = required;
          }
          
          return objectSchema;
          
        case 'ZodOptional':
          return convertSchema(def.innerType);
          
        case 'ZodEnum':
          return {
            type: 'string',
            enum: def.values
          };
          
        default:
          return { type: 'any' };
      }
    }
    
    return { type: 'any' };
  };

  return convertSchema(zodSchema);
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

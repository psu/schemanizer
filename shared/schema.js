import { z } from 'zod'

// Validation schemas for the API
export const convertRequestSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  mode: z.enum(['zod', 'json'], { message: "Mode must be 'zod' or 'json'" }),
})
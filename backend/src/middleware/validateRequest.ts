import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 Validating request body:', req.body)
      const validated = schema.parse(req.body)
      console.log('✅ Validation passed:', validated)
      req.body = validated
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Validation failed:', error.errors)
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }
      console.error('❌ Unexpected validation error:', error)
      next(error)
    }
  }
}
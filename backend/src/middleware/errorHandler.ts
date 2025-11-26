import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  data?: any

  constructor(message: string, statusCode: number, data?: any) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.data = data

    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal Server Error'
  let data: any = undefined

  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    data = err.data
  }

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(data && { data }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  })
}
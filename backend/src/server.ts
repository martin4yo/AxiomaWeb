import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { tenantMiddleware } from './middleware/tenantMiddleware.js'

// Routes
import authRoutes from './routes/auth.js'
import tenantRoutes from './routes/tenants.js'
import documentRoutes from './routes/documents.js'
import entityRoutes from './routes/entities.js'
import productRoutes from './routes/products.js'
import productCategoryRoutes from './routes/product-categories.js'
import productBrandRoutes from './routes/product-brands.js'
import customerCategoryRoutes from './routes/customer-categories.js'
import inventoryRoutes from './routes/inventoryRoutes.js'

// Load environment variables
config()

const app = express()
const port = process.env.PORT || 3001

// Initialize Prisma
export const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Axioma ERP Backend'
  })
})

// Public routes (no tenant required)
app.use('/api/auth', authRoutes)

// Tenant-scoped routes
app.use('/api/:tenantSlug', tenantMiddleware)
app.use('/api/:tenantSlug/tenants', tenantRoutes)
app.use('/api/:tenantSlug/documents', documentRoutes)
app.use('/api/:tenantSlug/entities', entityRoutes)
app.use('/api/:tenantSlug/products', productRoutes)
app.use('/api/:tenantSlug/product-categories', productCategoryRoutes)
app.use('/api/:tenantSlug/product-brands', productBrandRoutes)
app.use('/api/:tenantSlug/customer-categories', customerCategoryRoutes)
app.use('/api/:tenantSlug/inventory', inventoryRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Start server
app.listen(port, () => {
  logger.info(`🚀 Axioma ERP Backend running on port ${port}`)
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`)
})

export default app
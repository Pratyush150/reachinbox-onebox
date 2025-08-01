// Memory management optimized for t3.medium (4GB RAM)
const MEMORY_LIMIT_MB = 2048; // 2GB limit (leave 2GB for system)
const CHECK_INTERVAL = 30000; // Check every 30 seconds

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectElasticsearch } from './config/elasticsearch';
import { initializeServices } from './services';

// Import all route modules
import emailRoutes from './routes/emails';
import aiRoutes from './routes/ai';
import { accountRouter } from './routes/accounts';
import testRoutes from './routes/test';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

function setupMemoryMonitoring() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    // Log every 5 minutes
    if (Date.now() % (5 * 60 * 1000) < CHECK_INTERVAL) {
      console.log(`💾 Memory: ${heapUsedMB}MB heap / ${rssMB}MB total / ${MEMORY_LIMIT_MB}MB limit`);
    }
    
    // Force GC at 90% of limit
    if (heapUsedMB > MEMORY_LIMIT_MB * 0.9) {
      logger.warn(`Memory high: ${heapUsedMB}MB, forcing GC`);
      if (global.gc) {
        global.gc();
        const newUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        logger.info(`After GC: ${newUsage}MB`);
      }
    }
    
    // Restart if over limit
    if (heapUsedMB > MEMORY_LIMIT_MB) {
      logger.error(`Memory exceeded ${MEMORY_LIMIT_MB}MB, restarting...`);
      process.exit(1);
    }
  }, CHECK_INTERVAL);
}

// Error boundaries
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason?.message || reason);
});

const app = express();
const PORT = Number(process.env.PORT) || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://65.1.63.189:3000',
    'http://65.1.63.189:3001',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const memUsage = process.memoryUsage();
    const memoryInfo = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      limit: MEMORY_LIMIT_MB,
      usage: `${Math.round(memUsage.heapUsed / 1024 / 1024 / MEMORY_LIMIT_MB * 100)}%`
    };
    
    const servicesStatus = {
      imap: 'active',
      ai: 'active',
      notifications: 'active'
    };

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      memory: memoryInfo,
      instance: 't3.medium',
      services: {
        database: dbStatus,
        ...servicesStatus
      },
      endpoints: {
        emails: `${process.env.API_PREFIX || '/api/v1'}/emails`,
        accounts: `${process.env.API_PREFIX || '/api/v1'}/accounts`,
        ai: `${process.env.API_PREFIX || '/api/v1'}/ai`,
        test: `${process.env.API_PREFIX || '/api/v1'}/test`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error'
    });
  }
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

app.use(`${apiPrefix}/emails`, emailRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/accounts`, accountRouter);
app.use(`${apiPrefix}/test`, testRoutes);

// API Documentation endpoint
app.get(`${apiPrefix}/docs`, (req, res) => {
  const apiDocs = {
    title: 'ReachInbox API Documentation',
    version: '1.0.0',
    baseUrl: `http://65.1.63.189:${PORT}${apiPrefix}`,
    endpoints: {
      emails: {
        'GET /emails': 'Get all emails with filtering and pagination',
        'GET /emails/:id': 'Get single email by ID',
        'PUT /emails/:id/read': 'Mark email as read',
        'PUT /emails/:id/unread': 'Mark email as unread',
        'PUT /emails/:id/star': 'Toggle star status',
        'PUT /emails/:id/archive': 'Archive email',
        'POST /emails/bulk-actions': 'Perform bulk operations',
        'GET /emails/search': 'Advanced email search',
        'GET /emails/stats': 'Email statistics by folder/category'
      },
      ai: {
        'POST /ai/classify': 'Classify email content using AI',
        'POST /ai/generate-reply': 'Generate AI-powered reply',
        'GET /ai/categories': 'Get AI categories with descriptions',
        'POST /ai/batch-classify': 'Batch classify multiple emails',
        'GET /ai/insights/summary': 'Get AI insights summary'
      },
      accounts: {
        'GET /accounts': 'Get all email accounts',
        'POST /accounts': 'Add new email account',
        'GET /accounts/:id': 'Get account by ID',
        'POST /accounts/:id/test-connection': 'Test account connection',
        'GET /accounts/:id/stats': 'Get account statistics'
      },
      test: {
        'GET /test/health': 'System health check',
        'POST /test/setup-accounts': 'Setup test accounts',
        'POST /test/sample-emails': 'Generate sample emails',
        'POST /test/test-ai': 'Test AI classification',
        'GET /test/sync-status': 'Monitor sync progress'
      }
    },
    examples: {
      'Mark email as read': {
        method: 'PUT',
        url: '/emails/507f1f77bcf86cd799439011/read',
        response: { success: true, message: 'Email marked as read' }
      },
      'Bulk archive emails': {
        method: 'POST',
        url: '/emails/bulk-actions',
        body: {
          action: 'archive',
          emailIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
        }
      },
      'AI classify email': {
        method: 'POST',
        url: '/ai/classify',
        body: {
          subject: 'Interested in your product',
          body: 'Hi, I would like to schedule a demo',
          from: { address: 'client@company.com', name: 'John Doe' }
        }
      }
    }
  };

  res.json(apiDocs);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: `${apiPrefix}/docs`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    await connectElasticsearch();
    await initializeServices();
    
    // Start memory monitoring
    setupMemoryMonitoring();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 ReachInbox API Server running on port ${PORT}`);
      logger.info(`🔗 API Base: http://65.1.63.189:${PORT}${apiPrefix}`);
      logger.info(`📚 API Docs: http://65.1.63.189:${PORT}${apiPrefix}/docs`);
      logger.info(`❤️  Health Check: http://65.1.63.189:${PORT}/health`);
      logger.info(`🧪 Test APIs: http://65.1.63.189:${PORT}${apiPrefix}/test/health`);
      logger.info(`💾 Memory Limit: ${MEMORY_LIMIT_MB}MB (t3.medium optimized)`);
      
      logger.info(`\n📋 Quick API Reference:`);
      logger.info(`   GET  ${apiPrefix}/emails - Get all emails`);
      logger.info(`   PUT  ${apiPrefix}/emails/:id/read - Mark as read`);
      logger.info(`   POST ${apiPrefix}/emails/bulk-actions - Bulk operations`);
      logger.info(`   POST ${apiPrefix}/ai/classify - AI classification`);
      logger.info(`   GET  ${apiPrefix}/accounts - Email accounts`);
      logger.info(`   POST ${apiPrefix}/test/sample-emails - Generate test data`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error?.message || 'Unknown error');
    process.exit(1);
  }
}

startServer();
export default app;

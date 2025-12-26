const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const cron = require('node-cron');
const { ChromaClient } = require('chroma-js');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Configure Winston logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/memory-service.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize ChromaDB client
const chromaClient = new ChromaClient({
  path: 'http://192.168.68.69:8001' // SARK: ChromaDB
});

// Memory data models
const MEMORY_TYPES = {
  TECHNICAL: 'technical',
  ELECTRONICS: 'electronics',
  RELIGIOUS: 'religious'
};

const MEMORY_SCHEMA = {
  id: 'string',
  content: 'string',
  type: 'string',
  metadata: {
    created_at: 'timestamp',
    updated_at: 'timestamp',
    tags: ['string'],
    source: 'string',
    domain: 'string',
    evidence_anchors: ['string'],
    confidence_score: 'number'
  },
  embedding: 'float[]',
  session_id: 'string',
  verbatim_context: 'string',
  structured_data: {}
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'enhanced-memory-service',
    version: '1.0.0'
  });
});

// Test endpoint
app.post('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Memory Service is operational',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/memory',
      '/api/sessions',
      '/api/search',
      '/api/health'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Enhanced Memory Service running on port ${PORT}`);
  console.log(`🚀 Enhanced Memory Service listening on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
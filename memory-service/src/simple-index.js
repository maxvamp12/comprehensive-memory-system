const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

const app = express();
const PORT = 3000;

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

// Mock memory endpoints for testing
app.get('/api/memory', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Memory service operational - ChromaDB integration pending',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/memory', (req, res) => {
  res.json({
    success: true,
    message: 'Memory creation endpoint ready - ChromaDB integration pending',
    timestamp: new Date().toISOString()
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
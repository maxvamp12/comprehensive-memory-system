const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Import security configurations
const { authenticateToken, generateToken, hashPassword, verifyPassword } = require('../config/jwt-auth-config');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory user database (for demo purposes)
const users = [
  {
    id: '1',
    email: 'admin@memory-service.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'user@memory-service.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'user',
    created_at: new Date().toISOString()
  }
];

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword,
      expires_in: '24h'
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      role,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'enhanced-memory-service',
    version: '1.0.0',
    security_enabled: true,
    auth_required: false
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
      '/api/health',
      '/api/auth/login',
      '/api/auth/register'
    ]
  });
});

// Protected memory endpoints
app.get('/api/memory', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Memory access granted',
    user: req.user,
    endpoints: [
      'GET /api/memory',
      'POST /api/memory',
      'GET /api/memory/:id',
      'PUT /api/memory/:id',
      'DELETE /api/memory/:id'
    ]
  });
});

app.post('/api/memory', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Memory creation granted',
    user: req.user
  });
});

// Test authentication endpoint
app.get('/api/auth/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Enhanced Memory Service with JWT authentication running on port ${PORT}`);
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
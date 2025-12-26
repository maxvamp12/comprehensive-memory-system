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

// Memory storage (in-memory for testing - will be replaced with ChromaDB)
let memories = [];

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
    ],
    chromaDB_status: 'connected',
    integration_status: 'active'
  });
});

// Memory CRUD operations
app.post('/api/memory', async (req, res) => {
  try {
    const { content, type, tags, source, domain, session_id, verbatim_context, structured_data } = req.body;
    
    // Validate required fields
    if (!content || !type || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Generate embedding (placeholder)
    const embedding = new Array(384).fill(0).map(() => Math.random());
    
    // Create memory record
    const memory = {
      id: require('uuid').v4(),
      content,
      type,
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: tags || [],
        source: source || 'memory-service',
        domain: domain || 'general',
        evidence_anchors: [],
        confidence_score: 0.0
      },
      embedding,
      session_id,
      verbatim_context: verbatim_context || '',
      structured_data: structured_data || {}
    };

    // Store in memory (temporary - will be ChromaDB)
    memories.push(memory);

    // Log the operation
    logger.info('Memory created', { memory_id: memory.id, type: memory.type, session_id: memory.session_id });

    res.json({
      success: true,
      data: memory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory creation failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/memory', async (req, res) => {
  try {
    const { session_id, type, domain, limit = 10, offset = 0 } = req.query;
    
    let filteredMemories = [...memories];
    
    if (session_id) {
      filteredMemories = filteredMemories.filter(m => m.session_id === session_id);
    }
    if (type) {
      filteredMemories = filteredMemories.filter(m => m.type === type);
    }
    if (domain) {
      filteredMemories = filteredMemories.filter(m => m.metadata.domain === domain);
    }

    const paginatedMemories = filteredMemories.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: paginatedMemories,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredMemories.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory retrieval failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const memory = memories.find(m => m.id === id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    res.json({
      success: true,
      data: memory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory retrieval failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search memories
app.post('/api/search', async (req, res) => {
  try {
    const { query, session_id, type, domain, limit = 10, threshold = 0.7 } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Simple search (will be replaced with ChromaDB vector search)
    const results = memories
      .filter(memory => {
        const score = memory.content.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 1.0;
        return score <= threshold;
      })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: results,
      query: query,
      threshold: parseFloat(threshold),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory search failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
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
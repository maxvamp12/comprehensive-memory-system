const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const PORT = 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple memory storage (in-memory for testing)
let memories = [];

// Store memory
app.post('/api/memory', (req, res) => {
  const { content, type, tags, source, domain, session_id, verbatim_context, structured_data } = req.body;
  
  if (!content || !type || !session_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const memory = {
    id: Date.now().toString(),
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
    session_id,
    verbatim_context: verbatim_context || '',
    structured_data: structured_data || {}
  };

  memories.push(memory);
  
  res.json({
    success: true,
    data: memory,
    timestamp: new Date().toISOString()
  });
});

// Search memories
app.post('/api/search', (req, res) => {
  const { query, session_id, type, domain, limit = 10 } = req.body;
  
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  // Simple text-based search
  const results = memories
    .filter(memory => {
      const matchesQuery = memory.content.toLowerCase().includes(query.toLowerCase());
      const matchesSession = !session_id || memory.session_id === session_id;
      const matchesType = !type || memory.type === type;
      const matchesDomain = !domain || memory.domain === domain;
      return matchesQuery && matchesSession && matchesType && matchesDomain;
    })
    .slice(0, limit);

  res.json({
    success: true,
    data: results,
    query: query,
    timestamp: new Date().toISOString()
  });
});

// Get all memories
app.get('/api/memory', (req, res) => {
  res.json({
    success: true,
    data: memories,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Memory Service listening on http://0.0.0.0:${PORT}`);
});

module.exports = app;
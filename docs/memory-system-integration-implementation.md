# Memory System Integration Implementation Documentation

## Executive Summary

This document provides a comprehensive implementation plan for integrating a memory system into the existing DGX Spark infrastructure. The integration leverages the current vLLM cluster, ChromaDB instance, and Docker Swarm setup to create a robust, high-performance memory system with vector storage and retrieval capabilities.

## Current Infrastructure Analysis

### Server Configuration
- **SARK (192.168.68.69)**: Docker Swarm Manager, vLLM Head Node, ChromaDB Server
- **CLU (192.168.68.71)**: Docker Swarm Worker, vLLM Worker Node, Memory System Container
- **Network**: Multi-tier network with LAN (192.168.68.x), Swarm (192.168.100.x), and CONNECT-X (192.168.101.x)
- **Storage**: NVMe storage with 3.7TB capacity on both servers

### Existing Services
- **vLLM Cluster**: Distributed inference with GLM-4.5-Air-AWQ model
- **ChromaDB**: Vector database at 192.168.100.10:8001
- **Memory System**: Node.js container on CLU at port 3000
- **Open WebUI**: Web interface on SARK at port 3000
- **Borg Backup**: Backup server on SARK

## Integration Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                  DGX CLUSTER INTEGRATION                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   SARK       │  │   CLU       │  │   CONNECT-X │         │
│  │   (.69)      │  │   (.71)     │  │   Network   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         ▲                ▲                ▲                 │
│         │                │                │                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   ChromaDB   │  │   Memory    │  │   vLLM      │         │
│  │   :8001      │  │   System    │  │   Cluster   │         │
│  │   (Vector    │  │   :3000     │  │   (GPU      │         │
│  │   Storage)   │  │   (Enhanced)│  │   Processing)│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         ▲                ▲                ▲                 │
│         │                │                │                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Open      │  │   Memory    │  │   Embedding │         │
│  │   WebUI     │  │   Services  │  │   Service   │         │
│  │   :3000     │  │   (Node.js) │  │   (Python)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Network Configuration
```yaml
# Network Strategy
networks:
  lan:
    subnet: 192.168.68.0/24
    purpose: User-facing APIs
  swarm:
    subnet: 192.168.100.0/24
    purpose: Internal service communication
  connect-x:
    subnet: 192.168.101.0/24
    purpose: High-performance GPU operations
```

## Phase 1: Basic Integration (Week 1)

### 1.1 Enhance Memory System Container

#### Container Configuration
```yaml
# docker-compose.memory-system.yml
version: '3.8'

services:
  memory-system:
    image: node:18-alpine
    container_name: memory-system
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /home/maxvamp/memory-system-data:/data
      - /opt/memory-system:/app
    environment:
      - NODE_ENV=production
      - CHROMA_HOST=192.168.100.10
      - CHROMA_PORT=8001
      - CHROMA_AUTH=admin:admin
      - VLLM_HOST=192.168.101.10
      - VLLM_PORT=8000
      - LOG_LEVEL=info
    networks:
      - lan
      - swarm
    depends_on:
      - chromadb-check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  chromadb-check:
    image: curlimages/curl:latest
    command: ["sh", "-c", "until curl -f http://192.168.100.10:8001/api/v1/heartbeat; do echo waiting for chromadb; sleep 2; done"]
    networks:
      - swarm
```

#### Application Structure
```
/opt/memory-system/
├── src/
│   ├── index.js              # Main application entry point
│   ├── services/
│   │   ├── memory-service.js # Memory management service
│   │   ├── chroma-service.js # ChromaDB integration
│   │   └── vllm-service.js  # vLLM integration
│   ├── controllers/
│   │   ├── memory-controller.js
│   │   └── health-controller.js
│   ├── models/
│   │   ├── memory-model.js
│   │   └── session-model.js
│   └── utils/
│       ├── logger.js
│       └── validator.js
├── config/
│   ├── database.js
│   ├── chroma.js
│   └── vllm.js
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── Dockerfile
```

#### Memory Service Implementation
```javascript
// src/services/memory-service.js
const { ChromaService } = require('./chroma-service');
const { VLLMService } = require('./vllm-service');
const logger = require('../utils/logger');

class MemoryService {
  constructor() {
    this.chromaService = new ChromaService();
    this.vllmService = new VLLMService();
    this.sessions = new Map();
  }

  async createMemory(content, type, metadata = {}) {
    try {
      const memory = {
        id: this.generateId(),
        content,
        type,
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in ChromaDB
      await this.chromaService.storeMemory(memory);
      
      // Create embedding using vLLM
      const embedding = await this.vllmService.generateEmbedding(content);
      
      logger.info(`Memory created: ${memory.id}`);
      return memory;
    } catch (error) {
      logger.error(`Failed to create memory: ${error.message}`);
      throw error;
    }
  }

  async retrieveMemories(query, limit = 10) {
    try {
      // Generate query embedding
      const queryEmbedding = await this.vllmService.generateEmbedding(query);
      
      // Search ChromaDB
      const results = await this.chromaService.searchMemories(queryEmbedding, limit);
      
      return results;
    } catch (error) {
      logger.error(`Failed to retrieve memories: ${error.message}`);
      throw error;
    }
  }

  async updateMemory(id, updates) {
    try {
      const memory = await this.chromaService.getMemory(id);
      if (!memory) {
        throw new Error(`Memory not found: ${id}`);
      }

      const updatedMemory = {
        ...memory,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.chromaService.updateMemory(id, updatedMemory);
      logger.info(`Memory updated: ${id}`);
      return updatedMemory;
    } catch (error) {
      logger.error(`Failed to update memory: ${error.message}`);
      throw error;
    }
  }

  async deleteMemory(id) {
    try {
      await this.chromaService.deleteMemory(id);
      logger.info(`Memory deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete memory: ${error.message}`);
      throw error;
    }
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { MemoryService };
```

#### ChromaDB Service Implementation
```javascript
// src/services/chroma-service.js
const axios = require('axios');
const logger = require('../utils/logger');

class ChromaService {
  constructor() {
    this.baseUrl = `http://${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT}`;
    this.auth = {
      username: process.env.CHROMA_AUTH.split(':')[0],
      password: process.env.CHROMA_AUTH.split(':')[1]
    };
  }

  async storeMemory(memory) {
    try {
      const collection = await this.getOrCreateCollection('memories');
      
      const embedding = await this.generateEmbedding(memory.content);
      
      const document = {
        id: memory.id,
        metadata: {
          type: memory.type,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
          ...memory.metadata
        },
        document: memory.content,
        embedding: embedding
      };

      await this.addDocuments(collection.id, [document]);
      logger.info(`Memory stored in ChromaDB: ${memory.id}`);
    } catch (error) {
      logger.error(`Failed to store memory: ${error.message}`);
      throw error;
    }
  }

  async searchMemories(queryEmbedding, limit = 10) {
    try {
      const collection = await this.getOrCreateCollection('memories');
      
      const results = await this.queryCollection(collection.id, {
        query_embeddings: [queryEmbedding],
        n_results: limit,
        include: ['documents', 'metadatas', 'distances']
      });

      return results.documents[0].map((doc, index) => ({
        id: doc.id,
        content: doc.document,
        metadata: doc.metadata,
        distance: results.distances[0][index]
      }));
    } catch (error) {
      logger.error(`Failed to search memories: ${error.message}`);
      throw error;
    }
  }

  async getMemory(id) {
    try {
      const collection = await this.getOrCreateCollection('memories');
      const results = await this.queryCollection(collection.id, {
        query_texts: [id],
        n_results: 1,
        where: { id: { $eq: id } }
      });

      if (results.documents[0].length > 0) {
        return results.documents[0][0];
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get memory: ${error.message}`);
      throw error;
    }
  }

  async updateMemory(id, updates) {
    try {
      // Delete existing memory
      await this.deleteMemory(id);
      
      // Create updated memory
      const updatedMemory = { id, ...updates };
      await this.storeMemory(updatedMemory);
      
      logger.info(`Memory updated: ${id}`);
    } catch (error) {
      logger.error(`Failed to update memory: ${error.message}`);
      throw error;
    }
  }

  async deleteMemory(id) {
    try {
      const collection = await this.getOrCreateCollection('memories');
      await this.deleteDocuments(collection.id, { where: { id: { $eq: id } } });
      logger.info(`Memory deleted: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete memory: ${error.message}`);
      throw error;
    }
  }

  async getOrCreateCollection(name) {
    try {
      const collections = await this.getCollections();
      const existing = collections.find(c => c.name === name);
      
      if (existing) {
        return existing;
      }
      
      return await this.createCollection(name);
    } catch (error) {
      logger.error(`Failed to get/create collection: ${error.message}`);
      throw error;
    }
  }

  // ChromaDB API methods
  async getCollections() {
    const response = await axios.get(`${this.baseUrl}/api/v1/collections`, {
      auth: this.auth
    });
    return response.data;
  }

  async createCollection(name) {
    const response = await axios.post(`${this.baseUrl}/api/v1/collections`, {
      name,
      metadata: { description: `Memory collection for ${name}` }
    }, {
      auth: this.auth
    });
    return response.data;
  }

  async addDocuments(collectionId, documents) {
    const response = await axios.post(`${this.baseUrl}/api/v1/collections/${collectionId}/add`, {
      documents: documents.map(d => d.document),
      embeddings: documents.map(d => d.embedding),
      metadatas: documents.map(d => d.metadata),
      ids: documents.map(d => d.id)
    }, {
      auth: this.auth
    });
    return response.data;
  }

  async queryCollection(collectionId, query) {
    const response = await axios.post(`${this.baseUrl}/api/v1/collections/${collectionId}/query`, query, {
      auth: this.auth
    });
    return response.data;
  }

  async deleteDocuments(collectionId, where) {
    const response = await axios.delete(`${this.baseUrl}/api/v1/collections/${collectionId}`, {
      data: { where },
      auth: this.auth
    });
    return response.data;
  }

  async generateEmbedding(text) {
    // This will be implemented in Phase 2 with vLLM integration
    return [0.1, 0.2, 0.3]; // Placeholder
  }
}

module.exports = { ChromaService };
```

#### API Controllers
```javascript
// src/controllers/memory-controller.js
const { MemoryService } = require('../services/memory-service');
const logger = require('../utils/logger');

class MemoryController {
  constructor() {
    this.memoryService = new MemoryService();
  }

  async createMemory(req, res) {
    try {
      const { content, type, metadata } = req.body;
      
      if (!content || !type) {
        return res.status(400).json({ error: 'Content and type are required' });
      }

      const memory = await this.memoryService.createMemory(content, type, metadata);
      res.status(201).json(memory);
    } catch (error) {
      logger.error(`Create memory error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getMemories(req, res) {
    try {
      const { query, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const memories = await this.memoryService.retrieveMemories(query, parseInt(limit));
      res.json(memories);
    } catch (error) {
      logger.error(`Get memories error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async updateMemory(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const memory = await this.memoryService.updateMemory(id, updates);
      res.json(memory);
    } catch (error) {
      logger.error(`Update memory error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteMemory(req, res) {
    try {
      const { id } = req.params;
      
      await this.memoryService.deleteMemory(id);
      res.status(204).send();
    } catch (error) {
      logger.error(`Delete memory error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { MemoryController };
```

### 1.2 Network Configuration

#### Docker Network Setup
```bash
# Create dedicated network for memory system
docker network create --driver overlay memory-system-net

# Verify network creation
docker network ls | grep memory-system-net
```

#### Service Configuration
```javascript
// src/config/network.js
module.exports = {
  networks: {
    lan: {
      host: '192.168.68.71',
      port: 3000
    },
    swarm: {
      chromaHost: '192.168.100.10',
      chromaPort: 8001
    },
    connectX: {
      vllmHost: '192.168.101.10',
      vllmPort: 8000
    }
  }
};
```

### 1.3 Initial Testing

#### Health Check Endpoint
```javascript
// src/controllers/health-controller.js
const logger = require('../utils/logger');

class HealthController {
  async checkHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          memory: 'ok',
          chroma: 'ok',
          vllm: 'ok'
        }
      };
      res.json(health);
    } catch (error) {
      logger.error(`Health check error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { HealthController };
```

#### Test Suite
```javascript
// tests/integration/memory-service.test.js
const { MemoryService } = require('../../src/services/memory-service');
const { ChromaService } = require('../../src/services/chroma-service');

describe('Memory Service Integration', () => {
  let memoryService;

  beforeAll(async () => {
    memoryService = new MemoryService();
  });

  test('should create and retrieve memory', async () => {
    const memory = await memoryService.createMemory(
      'Test memory content',
      'text',
      { category: 'test' }
    );

    expect(memory).toBeDefined();
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe('Test memory content');
    expect(memory.type).toBe('text');
  });

  test('should search memories', async () => {
    await memoryService.createMemory(
      'Another test memory',
      'text',
      { category: 'test' }
    );

    const results = await memoryService.retrieveMemories('test');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

## Phase 2: Advanced Integration (Week 2)

### 2.1 vLLM Integration

#### vLLM Service Implementation
```javascript
// src/services/vllm-service.js
const axios = require('axios');
const logger = require('../utils/logger');

class VLLMService {
  constructor() {
    this.baseUrl = `http://${process.env.VLLM_HOST}:${process.env.VLLM_PORT}`;
    this.model = 'text-embedding-ada-002'; // Will be updated based on available models
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/embeddings`, {
        model: this.model,
        input: text
      });

      return response.data.data[0].embedding;
    } catch (error) {
      logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  async generateResponse(prompt, context = []) {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
        model: 'gpt-3.5-turbo', // Will be updated based on available models
        messages: [
          ...context,
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error(`Failed to generate response: ${error.message}`);
      throw error;
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get models: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { VLLMService };
```

#### Enhanced Memory Service with vLLM
```javascript
// src/services/memory-service.js (enhanced)
const { ChromaService } = require('./chroma-service');
const { VLLMService } = require('./vllm-service');
const logger = require('../utils/logger');

class MemoryService {
  constructor() {
    this.chromaService = new ChromaService();
    this.vllmService = new VLLMService();
    this.sessions = new Map();
  }

  // ... existing methods ...

  async generateMemoryInsights(memories) {
    try {
      const context = memories.map(m => ({
        content: m.content,
        metadata: m.metadata
      }));

      const prompt = `Based on the following memories, provide insights and connections:
${memories.map(m => `- ${m.content}`).join('\n')}`;

      const insights = await this.vllmService.generateResponse(prompt, context);
      return insights;
    } catch (error) {
      logger.error(`Failed to generate insights: ${error.message}`);
      throw error;
    }
  }

  async createMemoryWithInsights(content, type, metadata = {}) {
    try {
      const memory = await this.createMemory(content, type, metadata);
      
      // Generate insights based on similar memories
      const similarMemories = await this.retrieveMemories(content, 5);
      const insights = await this.generateMemoryInsights(similarMemories);
      
      // Store insights as a separate memory
      await this.createMemory(insights, 'insight', {
        sourceMemory: memory.id,
        category: 'analysis'
      });

      return memory;
    } catch (error) {
      logger.error(`Failed to create memory with insights: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { MemoryService };
```

### 2.2 Memory Management Services

#### Session Management
```javascript
// src/services/session-service.js
const logger = require('../utils/logger');

class SessionService {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  createSession(userId) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      memories: [],
      context: []
    };

    this.sessions.set(sessionId, session);
    this.setupSessionTimeout(sessionId);

    logger.info(`Session created: ${sessionId} for user: ${userId}`);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
    }
    return session;
  }

  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates);
    session.lastActivity = new Date().toISOString();

    logger.info(`Session updated: ${sessionId}`);
    return session;
  }

  addMemoryToSession(sessionId, memory) {
    const session = this.getSession(sessionId);
    session.memories.push(memory);
    session.context.push({
      type: 'memory',
      content: memory.content,
      timestamp: memory.createdAt
    });

    logger.info(`Memory added to session: ${sessionId}`);
    return session;
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      logger.info(`Session removed: ${sessionId}`);
    }
  }

  setupSessionTimeout(sessionId) {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session) {
        const now = new Date();
        const lastActivity = new Date(session.lastActivity);
        const timeSinceActivity = now - lastActivity;

        if (timeSinceActivity > this.sessionTimeout) {
          this.removeSession(sessionId);
          logger.info(`Session timeout: ${sessionId}`);
        }
      }
    }, this.sessionTimeout);
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { SessionService };
```

#### Context Management
```javascript
// src/services/context-service.js
const logger = require('../utils/logger');

class ContextService {
  constructor() {
    this.contexts = new Map();
  }

  createContext(userId, initialContext = []) {
    const contextId = this.generateContextId();
    const context = {
      id: contextId,
      userId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      items: initialContext,
      maxItems: 100 // Limit context size
    };

    this.contexts.set(contextId, context);
    logger.info(`Context created: ${contextId} for user: ${userId}`);
    return context;
  }

  updateContext(contextId, newItems) {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // Add new items and limit size
    context.items = [...context.items, ...newItems].slice(-context.maxItems);
    context.lastUpdated = new Date().toISOString();

    logger.info(`Context updated: ${contextId}`);
    return context;
  }

  getContext(contextId) {
    return this.contexts.get(contextId);
  }

  getContextByUser(userId) {
    for (const [contextId, context] of this.contexts) {
      if (context.userId === userId) {
        return context;
      }
    }
    return null;
  }

  generateContextId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { ContextService };
```

### 2.3 Enhanced API Controllers

#### Enhanced Memory Controller
```javascript
// src/controllers/memory-controller.js (enhanced)
const { MemoryService } = require('../services/memory-service');
const { SessionService } = require('../services/session-service');
const { ContextService } = require('../services/context-service');
const logger = require('../utils/logger');

class MemoryController {
  constructor() {
    this.memoryService = new MemoryService();
    this.sessionService = new SessionService();
    this.contextService = new ContextService();
  }

  async createMemory(req, res) {
    try {
      const { content, type, metadata, userId, sessionId } = req.body;
      
      if (!content || !type) {
        return res.status(400).json({ error: 'Content and type are required' });
      }

      let session = null;
      if (sessionId) {
        session = this.sessionService.getSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }
      } else if (userId) {
        session = this.sessionService.createSession(userId);
      }

      const memory = await this.memoryService.createMemory(content, type, metadata);
      
      if (session) {
        this.sessionService.addMemoryToSession(session.id, memory);
        this.contextService.updateContext(session.id, [{
          type: 'memory',
          content: memory.content,
          timestamp: memory.createdAt
        }]);
      }

      res.status(201).json({ memory, session: session?.id });
    } catch (error) {
      logger.error(`Create memory error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getMemoriesWithContext(req, res) {
    try {
      const { query, sessionId, limit = 10 } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const memories = await this.memoryService.retrieveMemories(query, parseInt(limit));
      
      let context = [];
      if (sessionId) {
        const session = this.sessionService.getSession(sessionId);
        if (session) {
          context = session.context;
        }
      }

      res.json({ memories, context });
    } catch (error) {
      logger.error(`Get memories with context error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async createMemoryWithInsights(req, res) {
    try {
      const { content, type, metadata, userId, sessionId } = req.body;
      
      if (!content || !type) {
        return res.status(400).json({ error: 'Content and type are required' });
      }

      let session = null;
      if (sessionId) {
        session = this.sessionService.getSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }
      } else if (userId) {
        session = this.sessionService.createSession(userId);
      }

      const memory = await this.memoryService.createMemoryWithInsights(content, type, metadata);
      
      if (session) {
        this.sessionService.addMemoryToSession(session.id, memory);
        this.contextService.updateContext(session.id, [{
          type: 'memory',
          content: memory.content,
          timestamp: memory.createdAt
        }]);
      }

      res.status(201).json({ memory, session: session?.id });
    } catch (error) {
      logger.error(`Create memory with insights error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async createSession(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const session = this.sessionService.createSession(userId);
      res.status(201).json(session);
    } catch (error) {
      logger.error(`Create session error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session);
    } catch (error) {
      logger.error(`Get session error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { MemoryController };
```

## Phase 3: Optimization (Week 3)

### 3.1 Performance Optimization

#### Caching Layer
```javascript
// src/services/cache-service.js
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 300, // 5 minutes default
      checkperiod: options.checkperiod || 120, // Check every 2 minutes
      useClones: false
    });
    
    this.hitCount = 0;
    this.missCount = 0;
  }

  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value) {
        this.hitCount++;
        logger.debug(`Cache hit: ${key}`);
        return value;
      }
      
      this.missCount++;
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(key, value, ttl) {
    try {
      this.cache.set(key, value, ttl);
      logger.debug(`Cache set: ${key}`);
    } catch (error) {
      logger.error(`Cache set error: ${error.message}`);
    }
  }

  async del(key) {
    try {
      this.cache.del(key);
      logger.debug(`Cache delete: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error: ${error.message}`);
    }
  }

  async clear() {
    try {
      this.cache.flushAll();
      logger.debug('Cache cleared');
    } catch (error) {
      logger.error(`Cache clear error: ${error.message}`);
    }
  }

  getStats() {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      size: this.cache.getStats().keys
    };
  }
}

module.exports = { CacheService };
```

#### Optimized Memory Service
```javascript
// src/services/memory-service.js (optimized)
const { ChromaService } = require('./chroma-service');
const { VLLMService } = require('./vllm-service');
const { CacheService } = require('./cache-service');
const logger = require('../utils/logger');

class MemoryService {
  constructor() {
    this.chromaService = new ChromaService();
    this.vllmService = new VLLMService();
    this.cacheService = new CacheService({ ttl: 300 }); // 5 minutes
    this.sessions = new Map();
  }

  async createMemory(content, type, metadata = {}) {
    try {
      // Check cache first
      const cacheKey = `create_${this.hashContent(content)}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Memory creation cached: ${cacheKey}`);
        return cached;
      }

      const memory = {
        id: this.generateId(),
        content,
        type,
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in ChromaDB
      await this.chromaService.storeMemory(memory);
      
      // Create embedding using vLLM
      const embedding = await this.vllmService.generateEmbedding(content);
      
      // Cache the result
      await this.cacheService.set(cacheKey, memory, 300);
      
      logger.info(`Memory created: ${memory.id}`);
      return memory;
    } catch (error) {
      logger.error(`Failed to create memory: ${error.message}`);
      throw error;
    }
  }

  async retrieveMemories(query, limit = 10) {
    try {
      // Check cache first
      const cacheKey = `retrieve_${this.hashContent(query)}_${limit}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Memory retrieval cached: ${cacheKey}`);
        return cached;
      }

      // Generate query embedding
      const queryEmbedding = await this.vllmService.generateEmbedding(query);
      
      // Search ChromaDB
      const results = await this.chromaService.searchMemories(queryEmbedding, limit);
      
      // Cache the results
      await this.cacheService.set(cacheKey, results, 300);
      
      return results;
    } catch (error) {
      logger.error(`Failed to retrieve memories: ${error.message}`);
      throw error;
    }
  }

  hashContent(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

module.exports = { MemoryService };
```

### 3.2 Security Hardening

#### Authentication Service
```javascript
// src/services/auth-service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error(`Password hash error: ${error.message}`);
      throw error;
    }
  }

  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error(`Password comparison error: ${error.message}`);
      throw error;
    }
  }

  generateToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    } catch (error) {
      logger.error(`Token generation error: ${error.message}`);
      throw error;
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.error(`Token verification error: ${error.message}`);
      throw error;
    }
  }

  async authenticateUser(username, password) {
    try {
      // In a real implementation, this would query a database
      const user = await this.findUserByUsername(username);
      
      if (!user) {
        throw new Error('User not found');
      }

      const isValid = await this.comparePassword(password, user.password);
      if (!isValid) {
        throw new Error('Invalid password');
      }

      const token = this.generateToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      return { user, token };
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      throw error;
    }
  }

  async findUserByUsername(username) {
    // Placeholder implementation
    return {
      id: 1,
      username,
      password: await this.hashPassword('password123'),
      role: 'user'
    };
  }
}

module.exports = { AuthService };
```

#### Security Middleware
```javascript
// src/middleware/auth-middleware.js
const { AuthService } = require('../services/auth-service');
const logger = require('../utils/logger');

const authService = new AuthService();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

const rateLimit = (windowMs, maxRequests) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    for (const [ip, timestamps] of requests) {
      requests.set(ip, timestamps.filter(time => time > windowStart));
    }
    
    const clientRequests = requests.get(req.ip) || [];
    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    clientRequests.push(now);
    requests.set(req.ip, clientRequests);
    next();
  };
};

module.exports = { authenticateToken, requireRole, rateLimit };
```

### 3.3 Monitoring and Logging

#### Enhanced Logger
```javascript
// src/utils/logger.js
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
```

#### Metrics Service
```javascript
// src/services/metrics-service.js
const logger = require('../utils/logger');

class MetricsService {
  constructor() {
    this.metrics = {
      memory_operations: {
        create: { count: 0, duration: 0 },
        retrieve: { count: 0, duration: 0 },
        update: { count: 0, duration: 0 },
        delete: { count: 0, duration: 0 }
      },
      system: {
        uptime: Date.now(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage()
      },
      errors: {
        total: 0,
        by_type: {}
      }
    };
  }

  recordMemoryOperation(operation, duration) {
    this.metrics.memory_operations[operation].count++;
    this.metrics.memory_operations[operation].duration += duration;
    logger.debug(`Memory operation ${operation}: ${duration}ms`);
  }

  recordError(errorType) {
    this.metrics.errors.total++;
    this.metrics.errors.by_type[errorType] = (this.metrics.errors.by_type[errorType] || 0) + 1;
    logger.error(`Error recorded: ${errorType}`);
  }

  getMetrics() {
    return {
      ...this.metrics,
      memory_operations: {
        ...this.metrics.memory_operations,
        average_duration: {
          create: this.metrics.memory_operations.create.duration / this.metrics.memory_operations.create.count || 0,
          retrieve: this.metrics.memory_operations.retrieve.duration / this.metrics.memory_operations.retrieve.count || 0,
          update: this.metrics.memory_operations.update.duration / this.metrics.memory_operations.update.count || 0,
          delete: this.metrics.memory_operations.delete.duration / this.metrics.memory_operations.delete.count || 0
        }
      }
    };
  }

  resetMetrics() {
    this.metrics.memory_operations = {
      create: { count: 0, duration: 0 },
      retrieve: { count: 0, duration: 0 },
      update: { count: 0, duration: 0 },
      delete: { count: 0, duration: 0 }
    };
    logger.info('Metrics reset');
  }
}

module.exports = { MetricsService };
```

## Phase 4: Production (Week 4)

### 4.1 Production Deployment

#### Docker Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  memory-system:
    image: comprehensive-memory-system:latest
    container_name: memory-system-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /home/maxvamp/memory-system-data:/data
      - /opt/memory-system:/app
      - /var/log/memory-system:/app/logs
    environment:
      - NODE_ENV=production
      - CHROMA_HOST=192.168.100.10
      - CHROMA_PORT=8001
      - CHROMA_AUTH=${CHROMA_AUTH}
      - VLLM_HOST=192.168.101.10
      - VLLM_PORT=8000
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=info
      - METRICS_ENABLED=true
    networks:
      - memory-system-net
    depends_on:
      - chromadb-check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: '2.0'
        reservations:
          memory: 4G
          cpus: '1.0'

  chromadb-check:
    image: curlimages/curl:latest
    command: ["sh", "-c", "until curl -f http://192.168.100.10:8001/api/v1/heartbeat; do echo waiting for chromadb; sleep 2; done"]
    networks:
      - memory-system-net

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus-memory-system
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - memory-system-net

  grafana:
    image: grafana/grafana:latest
    container_name: grafana-memory-system
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - memory-system-net

volumes:
  prometheus-data:
  grafana-data:

networks:
  memory-system-net:
    driver: overlay
```

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'memory-system'
    static_configs:
      - targets: ['memory-system:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'chromadb'
    static_configs:
      - targets: ['192.168.100.10:8001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### 4.2 Backup Integration

#### Backup Service
```javascript
// src/services/backup-service.js
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class BackupService {
  constructor() {
    this.backupDir = '/home/maxvamp/memory-system-backups';
    this.retentionDays = 30;
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `memory-system-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Backup memory data
      const sourceData = '/home/maxvamp/memory-system-data';
      const dataBackup = path.join(backupPath, 'data');
      await this.copyDirectory(sourceData, dataBackup);

      // Backup ChromaDB data
      const chromaBackup = path.join(backupPath, 'chromadb');
      await this.backupChromaDB(chromaBackup);

      // Create backup manifest
      const manifest = {
        timestamp,
        name: backupName,
        size: await this.getDirectorySize(backupPath),
        files: await this.countFiles(backupPath)
      };

      await fs.writeFile(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

      logger.info(`Backup created: ${backupName}`);
      return manifest;
    } catch (error) {
      logger.error(`Backup creation error: ${error.message}`);
      throw error;
    }
  }

  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!await this.pathExists(backupPath)) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Restore memory data
      const dataBackup = path.join(backupPath, 'data');
      const targetData = '/home/maxvamp/memory-system-data';
      await this.copyDirectory(dataBackup, targetData);

      // Restore ChromaDB data
      const chromaBackup = path.join(backupPath, 'chromadb');
      await this.restoreChromaDB(chromaBackup);

      logger.info(`Backup restored: ${backupName}`);
      return { success: true, backupName };
    } catch (error) {
      logger.error(`Backup restore error: ${error.message}`);
      throw error;
    }
  }

  async listBackups() {
    try {
      const backups = [];
      const items = await fs.readdir(this.backupDir);

      for (const item of items) {
        const itemPath = path.join(this.backupDir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          const manifestPath = path.join(itemPath, 'manifest.json');
          if (await this.pathExists(manifestPath)) {
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
            backups.push({
              name: item,
              timestamp: manifest.timestamp,
              size: manifest.size,
              files: manifest.files
            });
          }
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      logger.error(`Backup listing error: ${error.message}`);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const backups = await this.listBackups();
      let cleaned = 0;

      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        if (backupDate < cutoffDate) {
          const backupPath = path.join(this.backupDir, backup.name);
          await fs.rm(backupPath, { recursive: true, force: true });
          cleaned++;
        }
      }

      logger.info(`Cleaned up ${cleaned} old backups`);
      return cleaned;
    } catch (error) {
      logger.error(`Backup cleanup error: ${error.message}`);
      throw error;
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const items = await fs.readdir(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stats = await fs.stat(srcPath);

      if (stats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async backupChromaDB(backupPath) {
    try {
      await fs.mkdir(backupPath, { recursive: true });
      
      // Use borg backup for ChromaDB
      const chromaPath = '/home/maxvamp/chromadb-data';
      const command = `borg create --compression lz4 ${backupPath}::chromadb-${Date.now()} ${chromaPath}`;
      
      await this.executeCommand(command);
      logger.info('ChromaDB backup completed');
    } catch (error) {
      logger.error(`ChromaDB backup error: ${error.message}`);
      throw error;
    }
  }

  async restoreChromaDB(backupPath) {
    try {
      const command = `borg extract ${backupPath}`;
      await this.executeCommand(command);
      logger.info('ChromaDB restore completed');
    } catch (error) {
      logger.error(`ChromaDB restore error: ${error.message}`);
      throw error;
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async getDirectorySize(dir) {
    const items = await fs.readdir(dir);
    let size = 0;

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        size += await this.getDirectorySize(itemPath);
      } else {
        size += stats.size;
      }
    }

    return size;
  }

  async countFiles(dir) {
    const items = await fs.readdir(dir);
    let count = 0;

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        count += await this.countFiles(itemPath);
      } else {
        count++;
      }
    }

    return count;
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { BackupService };
```

### 4.3 Security Hardening

#### Environment Variables
```bash
# .env.production
NODE_ENV=production
CHROMA_HOST=192.168.100.10
CHROMA_PORT=8001
CHROMA_AUTH=admin:secure_password
VLLM_HOST=192.168.101.10
VLLM_PORT=8000
JWT_SECRET=your-super-secret-jwt-key
LOG_LEVEL=info
METRICS_ENABLED=true
GRAFANA_PASSWORD=your-grafana-password
BACKUP_RETENTION_DAYS=30
```

#### Security Headers Middleware
```javascript
// src/middleware/security-middleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
});

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

module.exports = { securityHeaders, rateLimiter, corsOptions };
```

## Monitoring and Alerting

### Health Check Endpoint
```javascript
// src/controllers/health-controller.js (enhanced)
const { MetricsService } = require('../services/metrics-service');
const logger = require('../utils/logger');

class HealthController {
  constructor() {
    this.metricsService = new MetricsService();
  }

  async checkHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          memory: 'ok',
          chroma: 'ok',
          vllm: 'ok'
        },
        metrics: this.metricsService.getMetrics()
      };
      res.json(health);
    } catch (error) {
      logger.error(`Health check error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getMetrics(req, res) {
    try {
      const metrics = this.metricsService.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error(`Metrics error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { HealthController };
```

## Testing Strategy

### Unit Tests
```javascript
// tests/unit/memory-service.test.js
const { MemoryService } = require('../../src/services/memory-service');
const { ChromaService } = require('../../src/services/chroma-service');
const { VLLMService } = require('../../src/services/vllm-service');

jest.mock('../../src/services/chroma-service');
jest.mock('../../src/services/vllm-service');

describe('Memory Service Unit Tests', () => {
  let memoryService;
  let chromaService;
  let vllmService;

  beforeEach(() => {
    chromaService = new ChromaService();
    vllmService = new VLLMService();
    memoryService = new MemoryService();
  });

  test('should create memory', async () => {
    const mockMemory = {
      id: 'test-id',
      content: 'Test content',
      type: 'text',
      metadata: { category: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    chromaService.storeMemory.mockResolvedValue(mockMemory);
    vllmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

    const result = await memoryService.createMemory('Test content', 'text', { category: 'test' });

    expect(result).toEqual(mockMemory);
    expect(chromaService.storeMemory).toHaveBeenCalledWith(mockMemory);
    expect(vllmService.generateEmbedding).toHaveBeenCalledWith('Test content');
  });

  test('should retrieve memories', async () => {
    const mockResults = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        metadata: { category: 'test' },
        distance: 0.1
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        metadata: { category: 'test' },
        distance: 0.2
      }
    ];

    vllmService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    chromaService.searchMemories.mockResolvedValue(mockResults);

    const result = await memoryService.retrieveMemories('test query', 10);

    expect(result).toEqual(mockResults);
    expect(vllmService.generateEmbedding).toHaveBeenCalledWith('test query');
    expect(chromaService.searchMemories).toHaveBeenCalledWith([0.1, 0.2, 0.3], 10);
  });
});
```

### Integration Tests
```javascript
// tests/integration/memory-system.test.js
const request = require('supertest');
const { MemoryService } = require('../../src/services/memory-service');
const { ChromaService } = require('../../src/services/chroma-service');

jest.mock('../../src/services/chroma-service');

describe('Memory System Integration Tests', () => {
  let app;
  let memoryService;
  let chromaService;

  beforeAll(() => {
    memoryService = new MemoryService();
    chromaService = new ChromaService();
    
    // Setup Express app
    const express = require('express');
    const { MemoryController } = require('../../src/controllers/memory-controller');
    
    app = express();
    app.use(express.json());
    app.post('/api/memories', new MemoryController().createMemory);
    app.get('/api/memories', new MemoryController().getMemories);
  });

  test('should create memory via API', async () => {
    const mockMemory = {
      id: 'test-id',
      content: 'Test content',
      type: 'text',
      metadata: { category: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    chromaService.storeMemory.mockResolvedValue(mockMemory);

    const response = await request(app)
      .post('/api/memories')
      .send({
        content: 'Test content',
        type: 'text',
        metadata: { category: 'test' }
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockMemory);
  });

  test('should retrieve memories via API', async () => {
    const mockResults = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        metadata: { category: 'test' },
        distance: 0.1
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        metadata: { category: 'test' },
        distance: 0.2
      }
    ];

    chromaService.searchMemories.mockResolvedValue(mockResults);

    const response = await request(app)
      .get('/api/memories')
      .query({ query: 'test query', limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResults);
  });
});
```

## Deployment Scripts

### Deployment Script
```bash
#!/bin/bash
# deploy-memory-system.sh

set -e

echo "Starting Memory System Deployment..."

# Configuration
CHROMA_HOST=${CHROMA_HOST:-"192.168.100.10"}
CHROMA_PORT=${CHROMA_PORT:-"8001"}
VLLM_HOST=${VLLM_HOST:-"192.168.101.10"}
VLLM_PORT=${VLLM_PORT:-"8000"}
MEMORY_SYSTEM_HOST=${MEMORY_SYSTEM_HOST:-"192.168.68.71"}

# Create necessary directories
echo "Creating directories..."
mkdir -p /home/maxvamp/memory-system-data
mkdir -p /home/maxvamp/memory-system-backups
mkdir -p /opt/memory-system
mkdir -p /var/log/memory-system

# Set permissions
echo "Setting permissions..."
chown -R maxvamp:maxvamp /home/maxvamp/memory-system-data
chown -R maxvamp:maxvamp /home/maxvamp/memory-system-backups
chown -R maxvamp:maxvamp /opt/memory-system
chown -R maxvamp:maxvamp /var/log/memory-system

# Deploy application
echo "Deploying application..."
cd /opt/memory-system
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Build application
echo "Building application..."
npm run build

# Create environment file
echo "Creating environment file..."
cat > .env << EOF
NODE_ENV=production
CHROMA_HOST=$CHROMA_HOST
CHROMA_PORT=$CHROMA_PORT
CHROMA_AUTH=admin:secure_password
VLLM_HOST=$VLLM_HOST
VLLM_PORT=$VLLM_PORT
JWT_SECRET=your-super-secret-jwt-key
LOG_LEVEL=info
METRICS_ENABLED=true
BACKUP_RETENTION_DAYS=30
EOF

# Deploy Docker containers
echo "Deploying Docker containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run health checks
echo "Running health checks..."
curl -f http://$MEMORY_SYSTEM_HOST:3000/health || {
  echo "Health check failed"
  exit 1
}

echo "Memory System Deployment completed successfully!"
```

### Backup Script
```bash
#!/bin/bash
# backup-memory-system.sh

set -e

echo "Starting Memory System Backup..."

# Configuration
BACKUP_DIR="/home/maxvamp/memory-system-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="memory-system-backup-$TIMESTAMP"

# Create backup directory
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

# Backup memory data
echo "Backing up memory data..."
cp -r /home/maxvamp/memory-system-data "$BACKUP_PATH/data"

# Backup ChromaDB data
echo "Backing up ChromaDB data..."
borg create --compression lz4 "$BACKUP_PATH::chromadb-$TIMESTAMP" /home/maxvamp/chromadb-data

# Create backup manifest
cat > "$BACKUP_PATH/manifest.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "name": "$BACKUP_NAME",
  "memory_data_size": $(du -sb /home/maxvamp/memory-system-data | cut -f1),
  "chromadb_data_size": $(du -sb /home/maxvamp/chromadb-data | cut -f1),
  "total_size": $(du -sb "$BACKUP_PATH" | cut -f1)
}
EOF

# Clean up old backups (keep last 7 days)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "memory-system-backup-*" -mtime +7 -exec rm -rf {} \;

echo "Memory System Backup completed successfully!"
echo "Backup location: $BACKUP_PATH"
```

## Conclusion

This implementation documentation provides a comprehensive guide for integrating a memory system into the existing DGX Spark infrastructure. The solution leverages the current vLLM cluster, ChromaDB instance, and Docker Swarm setup to create a robust, high-performance memory system with vector storage and retrieval capabilities.

### Key Features:
- **Enhanced Memory System**: Extends existing memory-system container with ChromaDB and vLLM integration
- **Vector Storage**: Uses existing ChromaDB for efficient memory storage and retrieval
- **GPU Processing**: Leverages vLLM cluster for embedding generation and LLM processing
- **Session Management**: Comprehensive session and context management
- **Performance Optimization**: Caching, monitoring, and performance optimization
- **Security Hardening**: Authentication, authorization, and security headers
- **Backup Integration**: Integration with existing borg-backup system
- **Monitoring**: Comprehensive monitoring and metrics collection

### Deployment Strategy:
- **Phase 1**: Basic integration with ChromaDB and existing memory system
- **Phase 2**: Advanced integration with vLLM and enhanced features
- **Phase 3**: Performance optimization and security hardening
- **Phase 4**: Production deployment with monitoring and backup integration

The solution is designed to be non-disruptive to existing services while providing enhanced memory capabilities for the DGX Spark environment.
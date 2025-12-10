#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server
 * Provides MCP protocol integration for opencode compatibility
 */

const net = require('net');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

// MCP Protocol constants
const MCP_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: 'memory-mcp-server',
  version: '1.0.0'
};

class MCPServer extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.server = null;
    this.clients = new Map();
    this.capabilities = new Map();
    this.tools = new Map();
    this.resources = new Map();
    
    this.initializeCapabilities();
    this.initializeTools();
    this.initializeResources();
  }

  initializeCapabilities() {
    // Define supported MCP capabilities
    this.capabilities.set('tools', true);
    this.capabilities.set('resources', true);
    this.capabilities.set('logging', true);
  }

  initializeTools() {
    // Define available tools
    this.tools.set('search_memories', {
      name: 'search_memories',
      description: 'Search memories using semantic similarity and filters',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 10
          },
          minSimilarity: {
            type: 'number',
            description: 'Minimum similarity threshold',
            default: 0.1
          },
          category: {
            type: 'string',
            description: 'Filter by category (optional)'
          },
          useSemanticSearch: {
            type: 'boolean',
            description: 'Use semantic search instead of keyword search',
            default: true
          }
        },
        required: ['query']
      }
    });

    this.tools.set('add_memory', {
      name: 'add_memory',
      description: 'Add a new memory to the system',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Memory content'
          },
          timestamp: {
            type: 'string',
            description: 'Timestamp (ISO format)',
            default: new Date().toISOString()
          },
          isDeclarative: {
            type: 'boolean',
            description: 'Whether this is a declarative memory',
            default: true
          },
          importanceScore: {
            type: 'number',
            description: 'Importance score (0-1)',
            default: 0.5
          },
          confidence: {
            type: 'number',
            description: 'Confidence score (0-1)',
            default: 0.8
          },
          entities: {
            type: 'object',
            description: 'Extracted entities',
            properties: {
              people: { type: 'array', items: { type: 'string' } },
              places: { type: 'array', items: { type: 'string' } },
              organizations: { type: 'array', items: { type: 'string' } },
              dates: { type: 'array', items: { type: 'string' } },
              money: { type: 'array', items: { type: 'string' } },
              numbers: { type: 'array', items: { type: 'string' } }
            }
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Memory categories'
          }
        },
        required: ['content']
      }
    });

    this.tools.set('get_memory', {
      name: 'get_memory',
      description: 'Retrieve a specific memory by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Memory ID to retrieve'
          }
        },
        required: ['id']
      }
    });

    this.tools.set('list_memories', {
      name: 'list_memories',
      description: 'List all memories with pagination',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of memories to return',
            default: 50
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination',
            default: 0
          },
          category: {
            type: 'string',
            description: 'Filter by category (optional)'
          }
        }
      }
    });
  }

  initializeResources() {
    // Define available resources
    this.resources.set('memory_stats', {
      uri: 'mem:///stats',
      name: 'Memory Statistics',
      description: 'System-wide memory statistics',
      mimeType: 'application/json'
    });

    this.resources.set('system_info', {
      uri: 'mem:///info', 
      name: 'System Information',
      description: 'System information and capabilities',
      mimeType: 'application/json'
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleClient(socket);
      });

      const port = this.config.opencode.mcpPort;
      console.log(`MCP Server attempting to listen on port ${port}`);
      
      this.server.listen(port, () => {
        console.log(`MCP Server listening on port ${port}`);
        this.emit('started');
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('MCP Server error:', error);
        this.emit('error', error);
        reject(error);
      });
    });
  }

  handleClient(socket) {
    const clientId = Date.now().toString();
    const client = {
      id: clientId,
      socket: socket,
      buffer: '',
      state: 'initialized'
    };

    this.clients.set(clientId, client);

    console.log(`MCP client connected: ${clientId}`);

    socket.on('data', (data) => {
      this.handleClientData(clientId, data);
    });

    socket.on('close', () => {
      console.log(`MCP client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    socket.on('error', (error) => {
      console.error(`MCP client error ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send initial response
    this.sendResponse(clientId, {
      jsonrpc: '2.0',
      id: 1,
      result: {
        capabilities: Object.fromEntries(this.capabilities),
        serverInfo: SERVER_INFO
      }
    });
  }

  handleClientData(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.buffer += data.toString();
    
    // Process complete JSON-RPC messages
    const lines = client.buffer.split('\n');
    client.buffer = lines.pop() || ''; // Keep incomplete message in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('MCP message parsing error:', error);
        }
      }
    }
  }

  handleMessage(clientId, message) {
    console.log(`MCP message from ${clientId}:`, JSON.stringify(message));

    switch (message.method) {
      case 'tools/list':
        this.handleToolsList(clientId, message);
        break;
      case 'tools/call':
        this.handleToolCall(clientId, message);
        break;
      case 'resources/list':
        this.handleResourcesList(clientId, message);
        break;
      case 'resources/read':
        this.handleResourceRead(clientId, message);
        break;
      case 'initialization':
        this.handleInitialization(clientId, message);
        break;
      case 'initialize':
        this.handleInitialization(clientId, message);
        break;
      default:
        this.sendError(clientId, message.id, -32601, 'Method not found');
    }
  }

  handleToolsList(clientId, message) {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    this.sendResponse(clientId, {
      jsonrpc: '2.0',
      id: message.id,
      result: { tools }
    });
  }

  async handleToolCall(clientId, message) {
    const { name, arguments: args } = message.params;

    const tool = this.tools.get(name);
    if (!tool) {
      this.sendError(clientId, message.id, -32601, 'Tool not found');
      return;
    }

    try {
      let result;
      switch (name) {
        case 'search_memories':
          result = await this.searchMemories(args);
          break;
        case 'add_memory':
          result = await this.addMemory(args);
          break;
        case 'get_memory':
          result = await this.getMemory(args);
          break;
        case 'list_memories':
          result = await this.listMemories(args);
          break;
        default:
          result = { error: 'Unknown tool' };
      }

      this.sendResponse(clientId, {
        jsonrpc: '2.0',
        id: message.id,
        result
      });
    } catch (error) {
      console.error(`Tool call error for ${name}:`, error);
      this.sendError(clientId, message.id, -32603, 'Internal error');
    }
  }

  handleResourcesList(clientId, message) {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));

    this.sendResponse(clientId, {
      jsonrpc: '2.0',
      id: message.id,
      result: { resources }
    });
  }

  async handleResourceRead(clientId, message) {
    const { uri } = message.params;

    const resource = this.resources.get(uri.replace('mem://', ''));
    if (!resource) {
      this.sendError(clientId, message.id, -32601, 'Resource not found');
      return;
    }

    try {
      let content;
      switch (uri) {
        case 'mem:///stats':
          content = await this.getMemoryStats();
          break;
        case 'mem:///info':
          content = await this.getSystemInfo();
          break;
        default:
          content = { error: 'Unknown resource' };
      }

      this.sendResponse(clientId, {
        jsonrpc: '2.0',
        id: message.id,
        result: { contents: [{ mimeType: resource.mimeType, text: JSON.stringify(content) }] }
      });
    } catch (error) {
      console.error(`Resource read error for ${uri}:`, error);
      this.sendError(clientId, message.id, -32603, 'Internal error');
    }
  }

  handleInitialization(clientId, message) {
    const client = this.clients.get(clientId);
    if (client) {
      client.state = 'initialized';
    }

    this.sendResponse(clientId, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        capabilities: Object.fromEntries(this.capabilities),
        serverInfo: SERVER_INFO
      }
    });
  }

  // Memory-related methods
  async searchMemories(args) {
    try {
      const { query, limit = 10, minSimilarity = 0.1, category, useSemanticSearch = true } = args;
      
      // Import the retrieval engine
      const { RetrievalEngine } = require('../retrieval-engine');
      const engine = new RetrievalEngine();
      
      const results = await engine.searchMemories({
        query,
        limit,
        minSimilarity,
        category,
        useSemanticSearch
      });

      return {
        memories: results.map(memory => ({
          id: memory.id,
          content: memory.content,
          timestamp: memory.timestamp,
          isDeclarative: memory.isDeclarative,
          importanceScore: memory.importanceScore,
          confidence: memory.confidence,
          entities: memory.entities,
          categories: memory.categories
        }))
      };
    } catch (error) {
      console.error('Search memories error:', error);
      return { error: 'Search failed' };
    }
  }

  async addMemory(args) {
    try {
      const { content, timestamp = new Date().toISOString(), isDeclarative = true, 
              importanceScore = 0.5, confidence = 0.8, entities = {}, categories = [] } = args;

      // Import storage manager
      const { StorageManager } = require('../storage-manager');
      const storage = new StorageManager();

      const memory = await storage.createMemory({
        content,
        timestamp: new Date(timestamp),
        isDeclarative,
        importanceScore,
        confidence,
        entities,
        categories
      });

      return {
        id: memory.id,
        message: 'Memory added successfully'
      };
    } catch (error) {
      console.error('Add memory error:', error);
      return { error: 'Failed to add memory' };
    }
  }

  async getMemory(args) {
    try {
      const { id } = args;

      // Import storage manager
      const { StorageManager } = require('../storage-manager');
      const storage = new StorageManager();

      const memory = await storage.getMemory(id);
      if (!memory) {
        return { error: 'Memory not found' };
      }

      return {
        memory: {
          id: memory.id,
          content: memory.content,
          timestamp: memory.timestamp,
          isDeclarative: memory.isDeclarative,
          importanceScore: memory.importanceScore,
          confidence: memory.confidence,
          entities: memory.entities,
          categories: memory.categories
        }
      };
    } catch (error) {
      console.error('Get memory error:', error);
      return { error: 'Failed to get memory' };
    }
  }

  async listMemories(args) {
    try {
      const { limit = 50, offset = 0, category } = args;

      // Import storage manager
      const { StorageManager } = require('../storage-manager');
      const storage = new StorageManager();

      const memories = await storage.listMemories({ limit, offset, category });

      return {
        memories: memories.map(memory => ({
          id: memory.id,
          content: memory.content,
          timestamp: memory.timestamp,
          isDeclarative: memory.isDeclarative,
          importanceScore: memory.importanceScore,
          confidence: memory.confidence,
          entities: memory.entities,
          categories: memory.categories
        })),
        total: memories.length
      };
    } catch (error) {
      console.error('List memories error:', error);
      return { error: 'Failed to list memories' };
    }
  }

  async getMemoryStats() {
    try {
      // Import storage manager
      const { StorageManager } = require('../storage-manager');
      const storage = new StorageManager();

      const stats = await storage.getMemoryStats();
      return {
        totalMemories: stats.total,
        declarativeMemories: stats.declarative,
        proceduralMemories: stats.procedural,
        categories: stats.categories,
        lastUpdated: stats.lastUpdated
      };
    } catch (error) {
      console.error('Get memory stats error:', error);
      return { error: 'Failed to get memory stats' };
    }
  }

  async getSystemInfo() {
    return {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      mcpVersion: MCP_VERSION,
      capabilities: Object.fromEntries(this.capabilities),
      tools: Array.from(this.tools.keys()),
      resources: Array.from(this.resources.keys()),
      uptime: process.uptime()
    };
  }

  sendResponse(clientId, response) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const message = JSON.stringify(response) + '\n';
    client.socket.write(message);
  }

  sendError(clientId, id, code, message) {
    this.sendResponse(clientId, {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('MCP Server stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Start the MCP server if this file is run directly
if (require.main === module) {
  async function startMCPServer() {
    try {
      // Load configuration
      const config = require('../config.json');
      
      const mcpServer = new MCPServer(config);
      
      mcpServer.on('started', () => {
        console.log('MCP Server started successfully');
      });
      
      mcpServer.on('error', (error) => {
        console.error('MCP Server error:', error);
        process.exit(1);
      });
      
      await mcpServer.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down MCP Server...');
        await mcpServer.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start MCP Server:', error);
      process.exit(1);
    }
  }
  
  startMCPServer();
}

module.exports = { MCPServer };
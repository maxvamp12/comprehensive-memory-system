const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const winston = require('winston');

// Import our memory system components
const RetrievalEngine = require('../core/retrieval-engine');
const StorageManager = require('../core/storage-manager');
const VectorEmbeddingService = require('../core/vector-embedding-service');

class MemoryServer {
    constructor(config = {}) {
        this.app = express();
        this.port = config.port || 3000;
        this.host = config.host || '0.0.0.0';
        
        // Initialize logging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/memory-server.log' }),
                new winston.transports.Console()
            ]
        });

        // Initialize memory system components
        this.storageManager = new StorageManager(config.storage || {});
        this.embeddingService = new VectorEmbeddingService(config.embedding || {});
        this.embeddingService.initialize().catch(error => {
            this.logger.error('Failed to initialize embedding service', { error: error.message });
        });
        
        // Pass embedding service to storage manager
        this.storageManager.embeddingService = this.embeddingService;

        this.retrievalEngine = new RetrievalEngine({
            storageManager: this.storageManager,
            embeddingService: this.embeddingService,
            maxResults: config.maxResults || 10,
            minSimilarity: config.minSimilarity || 0.5
        });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Enable CORS for all origins
        this.app.use(cors());
        
        // Parse JSON bodies
        this.app.use(bodyParser.json({ limit: '10mb' }));
        
        // Parse URL-encoded bodies
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Request logging middleware
        this.app.use((req, res, next) => {
            this.logger.info('Incoming request', {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'memory-server',
                version: '1.0.0'
            });
        });

        // Memory management endpoints
        this.app.post('/api/memories', async (req, res) => {
            try {
                const memory = req.body;
                await this.storageManager.storeMemory(memory);
                res.json({
                    success: true,
                    message: 'Memory stored successfully',
                    memoryId: memory.id,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Failed to store memory', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        this.app.get('/api/memories/:id', async (req, res) => {
            try {
                const memory = await this.storageManager.retrieveMemory(req.params.id);
                if (memory) {
                    res.json({
                        success: true,
                        memory: memory,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Memory not found',
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                this.logger.error('Failed to retrieve memory', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        this.app.get('/api/memories', async (req, res) => {
            try {
                const allMemories = await this.storageManager.getAllMemories();
                res.json({
                    success: true,
                    memories: allMemories,
                    count: allMemories.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Failed to retrieve all memories', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Search endpoint - OpenAI-compatible
        this.app.post('/api/v1/chat/completions', async (req, res) => {
            try {
                const { messages, model = 'memory-search', temperature = 0.1, max_tokens = 1000 } = req.body;
                
                if (!messages || !Array.isArray(messages)) {
                    return res.status(400).json({
                        error: {
                            message: 'Invalid messages format',
                            type: 'invalid_request_error'
                        }
                    });
                }

                // Extract query from the last user message
                const lastMessage = messages.find(msg => msg.role === 'user');
                if (!lastMessage) {
                    return res.status(400).json({
                        error: {
                            message: 'No user message found',
                            type: 'invalid_request_error'
                        }
                    });
                }

                const query = lastMessage.content;
                this.logger.info('Processing search query', { query, model });

                // Perform memory search
                const results = await this.retrievalEngine.search(query, {
                    useSemanticSearch: true,
                    limit: max_tokens
                });

                // Format response in OpenAI-compatible format
                const response = {
                    id: `chatcmpl-${Date.now()}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: this.formatSearchResults(results, query)
                        },
                        finish_reason: 'stop'
                    }],
                    usage: {
                        prompt_tokens: query.length,
                        completion_tokens: results.length * 50,
                        total_tokens: query.length + (results.length * 50)
                    }
                };

                res.json(response);
                
            } catch (error) {
                this.logger.error('Search failed', { error: error.message, query: req.body.query });
                res.status(500).json({
                    error: {
                        message: error.message,
                        type: 'server_error'
                    }
                });
            }
        });

        // Semantic search endpoint
        this.app.post('/api/search', async (req, res) => {
            try {
                const { query, limit = 10, minSimilarity = 0.1, category, useSemanticSearch = true } = req.body;
                
                if (!query) {
                    return res.status(400).json({
                        success: false,
                        error: 'Query is required',
                        timestamp: new Date().toISOString()
                    });
                }

                const results = await this.retrievalEngine.search(query, {
                    useSemanticSearch,
                    limit,
                    minImportance: 0,
                    category,
                    minSimilarity
                });

                res.json({
                    success: true,
                    query: query,
                    results: results,
                    count: results.length,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.logger.error('Search failed', { error: error.message, query: req.body.query });
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Related memories endpoint
        this.app.get('/api/memories/:id/related', async (req, res) => {
            try {
                const related = await this.retrievalEngine.getRelatedMemories(req.params.id, {
                    limit: 5
                });
                
                res.json({
                    success: true,
                    memoryId: req.params.id,
                    related: related,
                    count: related.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Failed to get related memories', { error: error.message });
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // System info endpoint
        this.app.get('/api/info', (req, res) => {
            res.json({
                success: true,
                service: 'Memory Server',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    memories: {
                        create: 'POST /api/memories',
                        get: 'GET /api/memories/:id',
                        list: 'GET /api/memories',
                        related: 'GET /api/memories/:id/related'
                    },
                    search: {
                        openai: 'POST /api/v1/chat/completions',
                        semantic: 'POST /api/search'
                    }
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    formatSearchResults(results, query) {
        if (results.length === 0) {
            return `I couldn't find any memories related to "${query}".`;
        }

        let response = `I found ${results.length} memories related to "${query}":\n\n`;
        
        results.slice(0, 5).forEach((memory, index) => {
            const preview = memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : '');
            const categories = memory.categories ? memory.categories.join(', ') : 'uncategorized';
            
            response += `${index + 1}. ${preview}\n`;
            response += `   Categories: ${categories}\n`;
            response += `   Similarity: ${(memory.similarity || 0).toFixed(3)}\n\n`;
        });

        if (results.length > 5) {
            response += `... and ${results.length - 5} more memories.`;
        }

        return response;
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            this.logger.error('Unhandled error', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, this.host, (error) => {
                if (error) {
                    this.logger.error('Failed to start server', { error: error.message });
                    reject(error);
                } else {
                    this.logger.info('Memory server started', { 
                        host: this.host, 
                        port: this.port,
                        url: `http://${this.host}:${this.port}`
                    });
                    resolve();
                }
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('Memory server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = MemoryServer;
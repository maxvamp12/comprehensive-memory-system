const chromadb = require('chromadb');
const winston = require('winston');

class ChromaDBService {
    constructor(config = {}) {
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 8000,
            collection: config.collection || 'memories',
            auth: config.auth || {},
            ...config
        };
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/chromadb.log' }),
                new winston.transports.Console()
            ]
        });

        this.client = null;
        this.collection = null;
        this.isRemote = this.config.host !== 'localhost';
        
        this.logger.info('ChromaDBService initialized', { 
            host: this.config.host, 
            port: this.config.port,
            collection: this.config.collection,
            isRemote: this.isRemote
        });
    }

    async initialize() {
        try {
            this.logger.info('Initializing ChromaDB client');
            
            // Create ChromaDB client with remote connection
            const clientConfig = {
                path: `http://${this.config.host}:${this.config.port}`
            };
            
            // Add authentication if configured
            if (this.config.auth && this.config.auth.username && this.config.auth.password) {
                clientConfig.settings = {
                    chroma_client_auth_provider: "chromadb.auth.basic.BasicAuthClientProvider",
                    chroma_client_auth_credentials: `${this.config.auth.username}:${this.config.auth.password}`
                };
            }
            
            this.client = new chromadb.ChromaClient(clientConfig);
            
            // Test connection
            await this.testConnection();
            
            // Get or create collection
            this.collection = await this.getOrCreateCollection();
            
            this.logger.info('ChromaDB client initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize ChromaDB client', { 
                error: error.message,
                host: this.config.host,
                port: this.config.port
            });
            throw error;
        }
    }

    async testConnection() {
        try {
            this.logger.info('Testing ChromaDB connection');
            
            // Test basic connection by attempting to list collections
            const collections = await this.client.listCollections();
            
            this.logger.info('ChromaDB connection test successful', { 
                collections: collections.map(c => c.name),
                host: this.config.host,
                port: this.config.port
            });
            
        } catch (error) {
            this.logger.error('ChromaDB connection test failed', { 
                error: error.message,
                host: this.config.host,
                port: this.config.port
            });
            
            // If connection fails, check if it's a network issue
            if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
                throw new Error(`Cannot connect to ChromaDB at ${this.config.host}:${this.config.port}. Please ensure the server is running and accessible.`);
            }
            
            throw error;
        }
    }

    async getOrCreateCollection() {
        try {
            // Try to get existing collection
            let collection = await this.client.getCollection({ name: this.config.collection });
            this.logger.info('Using existing ChromaDB collection', { collection: this.config.collection });
            return collection;
            
        } catch (error) {
            if (error.message.includes('does not exist')) {
                // Create new collection
                this.logger.info('Creating new ChromaDB collection', { collection: this.config.collection });
                const collection = await this.client.createCollection({ 
                    name: this.config.collection,
                    metadata: { description: "Memory system embeddings" }
                });
                return collection;
            } else {
                this.logger.error('Failed to get/create ChromaDB collection', { error: error.message });
                throw error;
            }
        }
    }

    async addMemory(memory) {
        try {
            if (!memory.embedding) {
                throw new Error('Memory must have embedding to store in ChromaDB');
            }

            const embedding = Array.from(memory.embedding);
            
            await this.collection.add({
                ids: [memory.id],
                embeddings: [embedding],
                metadatas: [{
                    content: memory.content,
                    timestamp: memory.timestamp,
                    isDeclarative: memory.isDeclarative,
                    importanceScore: memory.importanceScore,
                    confidence: memory.confidence,
                    categories: memory.categories || []
                }],
                documents: [memory.content]
            });

            this.logger.debug('Memory added to ChromaDB', { 
                memoryId: memory.id,
                content: memory.content.substring(0, 100) + '...',
                dimension: embedding.length
            });

        } catch (error) {
            this.logger.error('Failed to add memory to ChromaDB', { 
                error: error.message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    async updateMemory(memory) {
        try {
            if (!memory.embedding) {
                throw new Error('Memory must have embedding to update in ChromaDB');
            }

            const embedding = Array.from(memory.embedding);
            
            // Delete existing memory first
            await this.collection.delete({ ids: [memory.id] });
            
            // Add updated memory
            await this.collection.add({
                ids: [memory.id],
                embeddings: [embedding],
                metadatas: [{
                    content: memory.content,
                    timestamp: memory.timestamp,
                    isDeclarative: memory.isDeclarative,
                    importanceScore: memory.importanceScore,
                    confidence: memory.confidence,
                    categories: memory.categories || []
                }],
                documents: [memory.content]
            });

            this.logger.debug('Memory updated in ChromaDB', { 
                memoryId: memory.id,
                content: memory.content.substring(0, 100) + '...'
            });

        } catch (error) {
            this.logger.error('Failed to update memory in ChromaDB', { 
                error: error.message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    async deleteMemory(memoryId) {
        try {
            await this.collection.delete({ ids: [memoryId] });
            
            this.logger.debug('Memory deleted from ChromaDB', { memoryId });
            
        } catch (error) {
            this.logger.error('Failed to delete memory from ChromaDB', { 
                error: error.message,
                memoryId
            });
            throw error;
        }
    }

    async searchMemories(queryEmbedding, limit = 10, minSimilarity = 0.1) {
        try {
            if (!queryEmbedding || queryEmbedding.length === 0) {
                throw new Error('Query embedding is required');
            }

            const query = Array.from(queryEmbedding);
            
            this.logger.info('Searching memories in ChromaDB', { 
                limit,
                minSimilarity,
                dimension: query.length
            });
            
            const results = await this.collection.query({
                query_embeddings: [query],
                n_results: limit,
                include: ['documents', 'metadatas', 'distances']
            });

            // Process results and convert to memory format
            const memories = [];
            if (results.documents && results.documents.length > 0) {
                for (let i = 0; i < results.documents[0].length; i++) {
                    const distance = results.distances[0][i];
                    const similarity = 1 - distance; // Convert distance to similarity
                    
                    // Filter by minimum similarity
                    if (similarity >= minSimilarity) {
                        const metadata = results.metadatas[0][i];
                        memories.push({
                            id: results.ids[0][i],
                            content: results.documents[0][i],
                            timestamp: metadata.timestamp,
                            isDeclarative: metadata.isDeclarative,
                            importanceScore: metadata.importanceScore,
                            confidence: metadata.confidence,
                            categories: metadata.categories || [],
                            similarity,
                            distance
                        });
                    }
                }
            }

            this.logger.info('ChromaDB search completed', { 
                results: memories.length,
                topSimilarity: memories.length > 0 ? memories[0].similarity : 'N/A'
            });

            return memories;
            
        } catch (error) {
            this.logger.error('Failed to search memories in ChromaDB', { 
                error: error.message,
                limit,
                minSimilarity
            });
            throw error;
        }
    }

    async getMemoryStats() {
        try {
            // Get collection info
            const collectionInfo = await this.client.getCollection({ name: this.config.collection });
            
            // Try to get count (may not be available in all ChromaDB versions)
            let count = 0;
            try {
                const results = await this.collection.get();
                count = results.ids ? results.ids.length : 0;
            } catch (error) {
                this.logger.warn('Could not get memory count from ChromaDB', { error: error.message });
            }

            return {
                collection: this.config.collection,
                count,
                available: count > 0,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error('Failed to get ChromaDB stats', { error: error.message });
            return {
                collection: this.config.collection,
                count: 0,
                available: false,
                lastUpdated: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async clearCollection() {
        try {
            this.logger.warn('Clearing ChromaDB collection', { collection: this.config.collection });
            
            // Get all IDs and delete them
            const results = await this.collection.get();
            if (results.ids && results.ids.length > 0) {
                await this.collection.delete({ ids: results.ids });
            }
            
            this.logger.info('ChromaDB collection cleared');
            
        } catch (error) {
            this.logger.error('Failed to clear ChromaDB collection', { 
                error: error.message,
                collection: this.config.collection
            });
            throw error;
        }
    }

    async resetConnection() {
        try {
            this.logger.info('Resetting ChromaDB connection');
            
            // Close existing connection
            if (this.client) {
                // HttpClient doesn't have a close method, so we'll just recreate it
            }
            
            // Reinitialize
            await this.initialize();
            
            this.logger.info('ChromaDB connection reset successfully');
            
        } catch (error) {
            this.logger.error('Failed to reset ChromaDB connection', { error: error.message });
            throw error;
        }
    }

    async healthCheck() {
        try {
            await this.testConnection();
            const stats = await this.getMemoryStats();
            
            return {
                healthy: true,
                host: this.config.host,
                port: this.config.port,
                collection: this.config.collection,
                ...stats
            };
            
        } catch (error) {
            return {
                healthy: false,
                host: this.config.host,
                port: this.config.port,
                collection: this.config.collection,
                error: error.message
            };
        }
    }

    async close() {
        try {
            // ChromaDB HttpClient doesn't have an explicit close method
            this.logger.info('ChromaDB client resources released');
        } catch (error) {
            this.logger.error('Error closing ChromaDB client', { error: error.message });
        }
    }
}

module.exports = ChromaDBService;
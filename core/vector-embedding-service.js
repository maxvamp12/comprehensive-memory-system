const tf = require('@tensorflow/tfjs-node');
const winston = require('winston');

class VectorEmbeddingService {
    constructor(config = {}) {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/vector-embedding.log' }),
                new winston.transports.Console()
            ]
        });

        this.model = null;
        this.embeddingDimension = config.embeddingDimension || 768;
        this.cache = new Map(); // Simple cache for embeddings
        
        this.logger.info('VectorEmbeddingService initialized');
    }

    async initialize() {
        try {
            // For now, create a simple embedding model
            // In production, you would load a pre-trained model like Universal Sentence Encoder
            this.logger.info('Initializing vector embedding model');
            
            // Create a simple word embedding model
            this.model = {
                embed: async (text) => {
                    return this.createSimpleEmbedding(text);
                }
            };
            
            this.logger.info('Vector embedding model initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize vector embedding model', { error: error.message });
            throw error;
        }
    }

    async createSimpleEmbedding(text) {
        // Create a simple deterministic embedding based on text characteristics
        // This is a placeholder - in production, use real embeddings
        
        // Normalize text
        const normalized = text.toLowerCase().trim();
        const words = normalized.split(/\s+/).filter(word => word.length > 0);
        
        // Create embedding based on word characteristics
        const embedding = new Float32Array(this.embeddingDimension);
        
        // Simple hash-based embedding
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const hash = this.simpleHash(word);
            
            // Distribute hash values across embedding dimensions
            for (let j = 0; j < this.embeddingDimension; j++) {
                const index = (hash + j * i) % this.embeddingDimension;
                embedding[index] += Math.sin(hash + j) * 0.1;
            }
        }
        
        // Normalize embedding
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < this.embeddingDimension; i++) {
                embedding[i] /= magnitude;
            }
        }
        
        return embedding;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    async getEmbedding(text, useCache = true) {
        try {
            // Check cache first
            const cacheKey = text;
            if (useCache && this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Generate embedding
            const embedding = await this.model.embed(text);
            
            // Cache the embedding
            if (useCache) {
                this.cache.set(cacheKey, embedding);
            }
            
            this.logger.debug('Generated embedding', { 
                text: text.substring(0, 100) + '...', 
                dimension: embedding.length 
            });
            
            return embedding;
        } catch (error) {
            this.logger.error('Failed to generate embedding', { error: error.message, text });
            throw error;
        }
    }

    async calculateCosineSimilarity(vec1, vec2) {
        // Calculate cosine similarity between two vectors
        if (vec1.length !== vec2.length) {
            throw new Error('Vectors must have the same dimension');
        }

        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            magnitude1 += vec1[i] * vec1[i];
            magnitude2 += vec2[i] * vec2[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    async findSimilarMemories(queryEmbedding, memories, limit = 10) {
        try {
            this.logger.info('Finding similar memories', { memories: memories.length, limit });
            const similarities = [];

            for (const memory of memories) {
                if (!memory.embedding) {
                    continue; // Skip memories without embeddings
                }

                const similarity = await this.calculateCosineSimilarity(
                    queryEmbedding, 
                    memory.embedding
                );

                const clampedSimilarity = Math.max(0, Math.min(1, similarity));
                similarities.push({
                    ...memory,
                    similarity: clampedSimilarity
                });
                
                this.logger.debug('Memory similarity', { 
                    memoryId: memory.id, 
                    similarity: clampedSimilarity,
                    content: memory.content.substring(0, 50) + '...'
                });
            }

            this.logger.info('Found similar memories', { count: similarities.length });
            
            // Sort by similarity and return top results
            const sorted = similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
                
            this.logger.info('Top similarities', { 
                topSimilarity: sorted.length > 0 ? sorted[0].similarity : 'N/A',
                results: sorted.length
            });
            
            return sorted;
        } catch (error) {
            this.logger.error('Failed to find similar memories', { error: error.message });
            throw error;
        }
    }

    async generateMemoryEmbedding(memory) {
        try {
            const content = memory.content || memory.original || '';
            const embedding = await this.getEmbedding(content);
            
            return {
                ...memory,
                embedding: embedding
            };
        } catch (error) {
            this.logger.error('Failed to generate memory embedding', { 
                error: error.message, 
                memoryId: memory.id 
            });
            throw error;
        }
    }

    // Utility method to convert embedding to string for storage
    embeddingToString(embedding) {
        return embedding.map(val => val.toFixed(6)).join(',');
    }

    // Utility method to convert string back to embedding
    stringToEmbedding(str) {
        return new Float32Array(str.split(',').map(val => parseFloat(val)));
    }

    clearCache() {
        this.cache.clear();
        this.logger.info('Embedding cache cleared');
    }
}

module.exports = VectorEmbeddingService;
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class RetrievalEngine {
    constructor(config = {}) {
        this.storageManager = config.storageManager;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/retrieval.log' }),
                new winston.transports.Console()
            ]
        });
    }

    async search(query, options = {}) {
        try {
            const { limit = 10, minImportance = 0.1 } = options;
            
            // Get all memories
            const memories = await this.storageManager.getAllMemories();
            
            // Filter by importance and search
            const filteredMemories = memories.filter(memory => 
                memory.importanceScore >= minImportance
            );
            
            // Simple text search (can be enhanced with embeddings later)
            const queryLower = query.toLowerCase();
            const results = filteredMemories
                .filter(memory => 
                    memory.original.toLowerCase().includes(queryLower) ||
                    memory.categories.some(cat => cat.toLowerCase().includes(queryLower))
                )
                .slice(0, limit);
            
            this.logger.info('Search completed', { query, results: results.length });
            return results;
        } catch (error) {
            this.logger.error('Search failed', { error: error.message, query });
            throw error;
        }
    }

    async getMemoryById(memoryId) {
        try {
            const memories = await this.storageManager.getAllMemories();
            const memory = memories.find(m => m.id === memoryId);
            
            if (!memory) {
                throw new Error(`Memory with ID ${memoryId} not found`);
            }
            
            return memory;
        } catch (error) {
            this.logger.error('Failed to get memory by ID', { memoryId, error: error.message });
            throw error;
        }
    }

    async getRelatedMemories(memoryId, options = {}) {
        try {
            const memory = await this.getMemoryById(memoryId);
            const related = await this.search(memory.original.substring(0, 100), {
                ...options,
                limit: 5
            });
            
            // Remove the original memory from results
            return related.filter(m => m.id !== memoryId);
        } catch (error) {
            this.logger.error('Failed to get related memories', { memoryId, error: error.message });
            throw error;
        }
    }
}

module.exports = RetrievalEngine;
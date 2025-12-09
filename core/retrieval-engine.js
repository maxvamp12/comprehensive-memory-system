const winston = require('winston');

class RetrievalEngine {
    constructor(config = {}) {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/retrieval-engine.log' }),
                new winston.transports.Console()
            ]
        });

        this.storageManager = config.storageManager;
        this.maxResults = config.maxResults || 10;
        this.minSimilarity = config.minSimilarity || 0.5;

        this.logger.info('RetrievalEngine initialized');
    }

    async search(query, options = {}) {
        try {
            const {
                category,
                limit = this.maxResults,
                minImportance = 0,
                dateRange,
                useSemanticSearch = true
            } = options;

            this.logger.info('Starting memory search', { query, options });

            // Get all memories from storage
            const allMemories = await this.storageManager.getAllMemories();
            
            // Debug: Check for memories with undefined categories
            const invalidMemories = allMemories.filter(m => !m.category || typeof m.category !== 'string' && !Array.isArray(m.category));
            if (invalidMemories.length > 0) {
                this.logger.warn('Found memories with invalid categories', { 
                    count: invalidMemories.length,
                    sample: invalidMemories.slice(0, 3).map(m => ({ id: m.id, category: m.category }))
                });
            }
            
            // Filter memories based on criteria
            let filteredMemories = this.filterMemories(allMemories, {
                category,
                minImportance,
                dateRange,
                query
            });

            // Perform semantic search if enabled
            let results = filteredMemories;
            if (useSemanticSearch && query) {
                results = await this.semanticSearch(query, filteredMemories);
            } else {
                // Simple keyword matching fallback
                results = this.keywordSearch(query, filteredMemories);
            }

            // Apply limit and sort
            results = results.slice(0, limit);
            results = this.sortResults(results, query);

            this.logger.info('Search completed', { 
                query, 
                results: results.length,
                options 
            });

            return results;
        } catch (error) {
            this.logger.error('Search failed', { error: error.message, query });
            throw error;
        }
    }

    filterMemories(memories, criteria) {
        const filtered = memories.filter(memory => {
            // Filter by category (handle both string and array formats)
            if (criteria.category) {
                const memoryCategory = memory.category || memory.categories || [];
                const categories = Array.isArray(memoryCategory) ? memoryCategory : [memoryCategory];
                const hasCategory = categories.some(cat => cat && cat.toLowerCase() === criteria.category.toLowerCase());
                if (!hasCategory) {
                    return false;
                }
            }
            
            // Filter by minimum importance
            if (criteria.minImportance !== undefined && criteria.minImportance > 0) {
                if (!memory.importance || memory.importance < criteria.minImportance) {
                    return false;
                }
            }
            
            return true;
        });
        
        console.log('DEBUG: filterMemories result:', {
            originalCount: memories.length,
            filteredCount: filtered.length,
            criteria: criteria
        });
        
        return filtered;
    }

    async semanticSearch(query, memories) {
        // Simple semantic search implementation
        // In a real implementation, this would use vector embeddings
        const queryLower = query.toLowerCase();
        
        return memories.map(memory => {
            // Calculate similarity score
            const memoryContent = memory.content || memory.original || '';
            const score = this.calculateSimilarity(queryLower, memoryContent.toLowerCase());
            
            return {
                ...memory,
                similarity: score,
                relevance: this.calculateRelevance(memory, query)
            };
        }).filter(item => item.similarity >= this.minSimilarity);
    }

    keywordSearch(query, memories) {
        const queryLower = query.toLowerCase();
        
        // If query is empty, return all memories without filtering
        if (!query || query.trim() === '') {
            return memories.map(memory => ({
                ...memory,
                similarity: 1.0,
                relevance: 1.0
            }));
        }
        
        return memories.map(memory => {
            // Calculate keyword match score
            const memoryContent = memory.content || memory.original || '';
            const score = this.calculateKeywordScore(queryLower, memoryContent.toLowerCase());
            
            return {
                ...memory,
                similarity: score,
                relevance: score
            };
        }).filter(item => item.similarity >= this.minSimilarity);
    }

    calculateSimilarity(query, text) {
        // Simple similarity calculation
        const queryWords = query.split(/\s+/).filter(word => word.length > 0);
        const textWords = text.split(/\s+/).filter(word => word.length > 0);
        
        let matches = 0;
        for (const word of queryWords) {
            if (textWords.includes(word)) {
                matches++;
            }
        }
        
        return queryWords.length > 0 ? matches / queryWords.length : 0;
    }

    calculateKeywordScore(query, text) {
        const queryWords = query.split(/\s+/).filter(word => word.length > 0);
        let score = 0;
        
        for (const word of queryWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                score += matches.length;
            }
        }
        
        return score / queryWords.length;
    }

    calculateRelevance(memory, query) {
        // Calculate relevance based on multiple factors
        let relevance = memory.similarity;
        
        // Boost importance
        relevance += memory.importance * 0.3;
        
        // Boost recent memories
        const ageInDays = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 1 - ageInDays / 30); // Boost for memories less than 30 days old
        relevance += recencyBoost * 0.2;
        
        // Boost category match if query contains category keywords
        const queryLower = query.toLowerCase();
        const memoryCategory = memory.category || [];
        const categories = Array.isArray(memoryCategory) ? memoryCategory : [memoryCategory];
        const validCategories = categories.filter(cat => cat && typeof cat === 'string');
        const categoryMatch = validCategories.some(cat => 
            queryLower.includes(cat.toLowerCase())
        );
        if (categoryMatch) {
            relevance += 0.3;
        }
        
        return Math.min(relevance, 1.0);
    }

    sortResults(results, query) {
        return results.sort((a, b) => {
            // Primary sort: relevance score
            if (a.relevance !== b.relevance) {
                return b.relevance - a.relevance;
            }
            
            // Secondary sort: importance score
            if (a.importance !== b.importance) {
                return b.importance - a.importance;
            }
            
            // Tertiary sort: recency (newer first)
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    }

    async getMemoryById(memoryId) {
        try {
            const memory = await this.storageManager.retrieveMemory(memoryId);
            this.logger.info('Memory retrieved by ID', { memoryId });
            return memory;
        } catch (error) {
            this.logger.error('Failed to retrieve memory by ID', { memoryId, error: error.message });
            throw error;
        }
    }

    async getRelatedMemories(memoryId, options = {}) {
        try {
            const targetMemory = await this.storageManager.retrieveMemory(memoryId);
            const allMemories = await this.storageManager.getAllMemories();
            
            // Find memories with similar categories or entities
            const related = allMemories
                .filter(memory => memory.id !== memoryId)
                .map(memory => ({
                    ...memory,
                    relatedness: this.calculateRelatedness(targetMemory, memory)
                }))
                .filter(item => item.relatedness >= 0.3)
                .sort((a, b) => b.relatedness - a.relatedness)
                .slice(0, options.limit || 5);

            this.logger.info('Related memories found', { 
                memoryId, 
                related: related.length 
            });
            
            return related;
        } catch (error) {
            this.logger.error('Failed to get related memories', { memoryId, error: error.message });
            throw error;
        }
    }

    calculateRelatedness(memory1, memory2) {
        let relatedness = 0;
        
        // Check category overlap
        const categories1 = Array.isArray(memory1.category) ? memory1.category : [memory1.category];
        const categories2 = Array.isArray(memory2.category) ? memory2.category : [memory2.category];
        const commonCategories = categories1.filter(cat => 
            categories2.includes(cat)
        );
        relatedness += commonCategories.length * 0.4;
        
        // Check entity overlap
        const commonEntities = this.findCommonEntities(memory1, memory2);
        relatedness += commonEntities.length * 0.3;
        
        // Check similarity
        relatedness += this.calculateSimilarity(
            memory1.content.toLowerCase(), 
            memory2.content.toLowerCase()
        ) * 0.3;
        
        return Math.min(relatedness, 1.0);
    }

    findCommonEntities(memory1, memory2) {
        const entities1 = [
            ...(memory1.entities.people || []),
            ...(memory1.entities.places || []),
            ...(memory1.entities.locations || []),
            ...(memory1.entities.organizations || []),
            ...(memory1.entities.dates || []),
            ...(memory1.entities.concepts || []),
            ...(memory1.entities.products || [])
        ];
        
        const entities2 = [
            ...(memory2.entities.people || []),
            ...(memory2.entities.places || []),
            ...(memory2.entities.locations || []),
            ...(memory2.entities.organizations || []),
            ...(memory2.entities.dates || []),
            ...(memory2.entities.concepts || []),
            ...(memory2.entities.products || [])
        ];
        
        return entities1.filter(entity => 
            entities2.some(e2 => e2 && e2.toLowerCase() === entity.toLowerCase())
        );
    }
}

module.exports = RetrievalEngine;
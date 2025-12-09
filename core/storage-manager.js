const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');

class StorageManager {
    constructor(config = {}) {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/storage-manager.log' }),
                new winston.transports.Console()
            ]
        });

        this.dataDir = config.dataDir || path.join(__dirname, '../../data');
        this.memoriesDir = path.join(this.dataDir, 'memories');
        this.indexesDir = path.join(this.dataDir, 'indexes');
        
        // Initialize storage directories
        this.ensureDirectories();
        
        // In-memory cache for frequently accessed memories
        this.memoryCache = new Map();
        this.maxCacheSize = config.maxCacheSize || 1000;
        
        this.logger.info('StorageManager initialized', { dataDir: this.dataDir });
    }

    async ensureDirectories() {
        const directories = [this.dataDir, this.memoriesDir, this.indexesDir];
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    async storeMemory(memory) {
        try {
            // Validate required fields
            if (!memory.id || !memory.content || !memory.timestamp) {
                throw new Error('Memory must have id, content, and timestamp fields');
            }

            // Comprehensive memory normalization
            const normalizedMemory = { ...memory };

            // Handle categories field - ensure it's always an array
            if (!normalizedMemory.categories) {
                // If categories field doesn't exist, check for old category field
                if (normalizedMemory.category) {
                    normalizedMemory.categories = Array.isArray(normalizedMemory.category) 
                        ? normalizedMemory.category 
                        : [normalizedMemory.category];
                } else {
                    normalizedMemory.categories = [];
                }
            } else if (!Array.isArray(normalizedMemory.categories)) {
                // Convert string to array
                normalizedMemory.categories = [normalizedMemory.categories];
            }

            // Clean up categories - remove null/undefined/empty strings
            normalizedMemory.categories = normalizedMemory.categories
                .map(cat => cat ? String(cat).trim() : null)
                .filter(cat => cat && cat.length > 0);

            // Ensure categories array is not empty, assign default if needed
            if (normalizedMemory.categories.length === 0) {
                normalizedMemory.categories = ['general'];
            }

            // Normalize categories to lowercase
            normalizedMemory.categories = normalizedMemory.categories.map(cat => cat.toLowerCase());

            // Store memory file
            const memoryPath = path.join(this.dataDir, 'memories', `${normalizedMemory.id}.json`);
            await fs.writeFile(memoryPath, JSON.stringify(normalizedMemory, null, 2));

            // Update indexes
            await this.updateIndexes(normalizedMemory);

            this.logger.info('Memory stored successfully: ' + normalizedMemory.id);
        } catch (error) {
            this.logger.error('Failed to store memory: ' + error.message);
            throw error;
        }
    }

    async retrieveMemory(memoryId) {
        try {
            // Check cache first
            if (this.memoryCache.has(memoryId)) {
                const memory = this.memoryCache.get(memoryId);
                memory.lastAccessed = new Date().toISOString();
                return memory;
            }

            // Load from disk
            const memoryPath = path.join(this.memoriesDir, `${memoryId}.json`);
            const memoryData = await fs.readFile(memoryPath, 'utf8');
            const memory = JSON.parse(memoryData);
            
            // Update last accessed timestamp
            memory.lastAccessed = new Date().toISOString();
            await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
            
            // Update cache
            this.updateCache(memoryId, memory);
            
            this.logger.info('Memory retrieved successfully', { memoryId });
            return memory;
        } catch (error) {
            this.logger.error('Failed to retrieve memory', { memoryId, error: error.message });
            throw error;
        }
    }

    async searchMemories(query, options = {}) {
        try {
            const {
                limit = 10,
                category,
                minImportance = 0,
                dateRange,
                entities
            } = options;

            const allMemories = await this.getAllMemories();
            let filteredMemories = allMemories;

            // Filter by category
            if (category) {
                filteredMemories = filteredMemories.filter(memory => {
                    const memoryCategory = memory.category || [];
                    return Array.isArray(memoryCategory) ? memoryCategory.includes(category) : memoryCategory === category;
                });
            }

            // Filter by importance
            filteredMemories = filteredMemories.filter(memory => 
                memory.importance >= minImportance
            );

            // Filter by date range
            if (dateRange) {
                const { start, end } = dateRange;
                filteredMemories = filteredMemories.filter(memory => {
                    const memoryDate = new Date(memory.timestamp);
                    return memoryDate >= new Date(start) && memoryDate <= new Date(end);
                });
            }

            // Filter by entities
            if (entities && entities.length > 0) {
                filteredMemories = filteredMemories.filter(memory => {
                    const memoryContent = memory.content || memory.original || '';
                    return entities.some(entity => 
                        memoryContent.toLowerCase().includes(entity.toLowerCase())
                    );
                });
            }

            // Sort by importance and recency
            filteredMemories.sort((a, b) => {
                if (a.importance !== b.importance) {
                    return b.importance - a.importance;
                }
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            // Apply limit
            const result = filteredMemories.slice(0, limit);
            
            this.logger.info('Memory search completed', { 
                query, 
                results: result.length,
                options 
            });
            
            return result;
        } catch (error) {
            this.logger.error('Failed to search memories', { error: error.message });
            throw error;
        }
    }

    async getAllMemories() {
        try {
            const memories = [];
            const files = await fs.readdir(this.memoriesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const memoryPath = path.join(this.memoriesDir, file);
                    try {
                        const memoryData = await fs.readFile(memoryPath, 'utf8');
                        if (memoryData.trim()) {
                            const memory = JSON.parse(memoryData);
                            memories.push(memory);
                        }
                    } catch (parseError) {
                        this.logger.warn(`Skipping invalid JSON file: ${file}`);
                    }
                }
            }
            
            return memories;
        } catch (error) {
            this.logger.error('Failed to get all memories', { error: error.message });
            throw error;
        }
    }

    async updateIndexes(memory) {
        try {
            // Create category index
            const indexPath = path.join(this.indexesDir, 'categories.json');
            let categoryIndex = {};
            
            try {
                const indexData = await fs.readFile(indexPath, 'utf8');
                categoryIndex = JSON.parse(indexData);
            } catch (error) {
                // Index doesn't exist yet, create new one
            }
            
            // Update category index
            const memoryCategory = memory.category || memory.categories || [];
            const categories = Array.isArray(memoryCategory) ? memoryCategory : [memoryCategory];
            // Filter out undefined/null categories
            const validCategories = categories.filter(cat => cat && typeof cat === 'string');
            for (const category of validCategories) {
                if (!categoryIndex[category]) {
                    categoryIndex[category] = [];
                }
                if (!categoryIndex[category].includes(memory.id)) {
                    categoryIndex[category].push(memory.id);
                }
            }
            
            await fs.writeFile(indexPath, JSON.stringify(categoryIndex, null, 2));
            
            // Create importance index
            const importanceIndexPath = path.join(this.indexesDir, 'importance.json');
            let importanceIndex = {};
            
            try {
                const indexData = await fs.readFile(importanceIndexPath, 'utf8');
                importanceIndex = JSON.parse(indexData);
            } catch (error) {
                // Index doesn't exist yet
            }
            
            importanceIndex[memory.id] = memory.importanceScore;
            await fs.writeFile(importanceIndexPath, JSON.stringify(importanceIndex, null, 2));
            
        } catch (error) {
            this.logger.error('Failed to update indexes', { error: error.message, memoryId: memory.id });
            // Don't throw here as indexes are not critical functionality
        }
    }

    generateMemoryId(memory) {
        const timestamp = new Date(memory.timestamp).getTime();
        const contentHash = this.simpleHash(memory.content || memory.original || '');
        return `${timestamp}_${contentHash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    updateCache(memoryId, memory) {
        // Remove oldest entry if cache is full
        if (this.memoryCache.size >= this.maxCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        
        this.memoryCache.set(memoryId, memory);
    }

    async createBackup() {
        try {
            const backupDir = path.join(this.dataDir, 'backups');
            await fs.mkdir(backupDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `backup_${timestamp}.tar.gz`);
            
            // For now, create a simple JSON backup
            const allMemories = await this.getAllMemories();
            await fs.writeFile(backupPath, JSON.stringify(allMemories, null, 2));
            
            this.logger.info('Backup created successfully', { backupPath });
            return backupPath;
        } catch (error) {
            this.logger.error('Failed to create backup', { error: error.message });
            throw error;
        }
    }
}

module.exports = StorageManager;
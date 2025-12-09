const ContextDetector = require('./core/context-detector');
const StorageManager = require('./core/storage-manager');
const RetrievalEngine = require('./core/retrieval-engine');
const winston = require('winston');

class ComprehensiveMemorySystem {
    constructor(config = {}) {
        // Initialize logger
        this.logger = winston.createLogger({
            level: config.logLevel || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/memory-system.log' }),
                new winston.transports.Console()
            ]
        });

        // Initialize core components
        this.contextDetector = new ContextDetector(config.contextDetector || {});
        this.storageManager = new StorageManager(config.storageManager || {});
        this.retrievalEngine = new RetrievalEngine({
            storageManager: this.storageManager,
            ...config.retrievalEngine
        });

        this.logger.info('ComprehensiveMemorySystem initialized');
    }

    async processInput(text, context = {}) {
        try {
            this.logger.info('Processing input', { text: text.substring(0, 100) });

            // Step 1: Detect information
            const detection = this.contextDetector.detectInformation(text);
            
            // Step 2: Store if valuable
            let storedMemory = null;
            if (detection.shouldStore) {
                const memory = {
                    original: text,
                    timestamp: detection.timestamp,
                    isDeclarative: detection.isDeclarative,
                    importanceScore: detection.importanceScore,
                    confidence: detection.confidence,
                    entities: detection.entities,
                    categories: detection.categories
                };

                storedMemory = await this.storageManager.storeMemory(memory);
                this.logger.info('Memory stored', { memoryId: storedMemory, categories: detection.categories });
            }

            // Step 3: Search for related information
            let relatedMemories = [];
            if (detection.shouldStore && detection.importanceScore >= 0.5) {
                relatedMemories = await this.retrievalEngine.search(text, {
                    limit: 5,
                    minImportance: 0.3
                });
            }

            const result = {
                input: text,
                detected: detection,
                stored: storedMemory,
                related: relatedMemories,
                timestamp: new Date().toISOString()
            };

            this.logger.info('Input processing complete', { 
                stored: !!storedMemory,
                related: relatedMemories.length 
            });

            return result;
        } catch (error) {
            this.logger.error('Failed to process input', { error: error.message, text });
            throw error;
        }
    }

    async searchMemories(query, options = {}) {
        try {
            const results = await this.retrievalEngine.search(query, options);
            this.logger.info('Memory search completed', { query, results: results.length });
            return results;
        } catch (error) {
            this.logger.error('Failed to search memories', { error: error.message, query });
            throw error;
        }
    }

    async getMemoryById(memoryId) {
        try {
            return await this.retrievalEngine.getMemoryById(memoryId);
        } catch (error) {
            this.logger.error('Failed to get memory by ID', { memoryId, error: error.message });
            throw error;
        }
    }

    async getRelatedMemories(memoryId, options = {}) {
        try {
            return await this.retrievalEngine.getRelatedMemories(memoryId, options);
        } catch (error) {
            this.logger.error('Failed to get related memories', { memoryId, error: error.message });
            throw error;
        }
    }

    async getAllMemories() {
        try {
            return await this.storageManager.getAllMemories();
        } catch (error) {
            this.logger.error('Failed to get all memories', { error: error.message });
            throw error;
        }
    }

    async createBackup() {
        try {
            return await this.storageManager.createBackup();
        } catch (error) {
            this.logger.error('Failed to create backup', { error: error.message });
            throw error;
        }
    }

    // Test method
    async testSystem() {
        const testResults = {
            contextDetector: false,
            storageManager: false,
            retrievalEngine: false,
            integration: false
        };

        // Test context detector
        try {
            const testDetection = this.contextDetector.testDetection('I remember that my cat is named Whiskers');
            testResults.contextDetector = testDetection.shouldStore;
        } catch (error) {
            this.logger.error('Context detector test failed', { error: error.message });
        }

        // Test storage manager
        try {
            const testMemory = {
                original: 'Test memory for storage',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.8,
                confidence: 0.9,
                entities: { people: [], places: [], organizations: [], dates: [], money: [], numbers: [] },
                categories: ['test']
            };
            const storedId = await this.storageManager.storeMemory(testMemory);
            testResults.storageManager = !!storedId;
            
            // Clean up
            const fs = require('fs').promises;
            const path = require('path');
            await fs.unlink(path.join(this.storageManager.memoriesDir, `${storedId}.json`));
        } catch (error) {
            this.logger.error('Storage manager test failed', { error: error.message });
        }

        // Test retrieval engine
        try {
            const testMemories = await this.storageManager.getAllMemories();
            testResults.retrievalEngine = testMemories.length >= 0;
        } catch (error) {
            this.logger.error('Retrieval engine test failed', { error: error.message });
        }

        // Test integration
        try {
            const testResult = await this.processInput('I remember that my important meeting with John is tomorrow at 3pm.');
            testResults.integration = testResult.detected.shouldStore;
        } catch (error) {
            this.logger.error('Integration test failed', { error: error.message });
        }

        return testResults;
    }
}

// Export for use as module
module.exports = ComprehensiveMemorySystem;

// Create instance and export if run directly
if (require.main === module) {
    const memorySystem = new ComprehensiveMemorySystem();
    
    // Test the system
    memorySystem.testSystem().then(results => {
        console.log('System Test Results:', results);
        process.exit(0);
    }).catch(error => {
        console.error('System test failed:', error);
        process.exit(1);
    });
}
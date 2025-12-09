const RetrievalEngine = require('./core/retrieval-engine');
const StorageManager = require('./core/storage-manager');
const fs = require('fs').promises;
const path = require('path');

describe('RetrievalEngine - Core Functionality', () => {
    let engine;
    let storage;
    const testDir = path.join(__dirname, 'test-data');

    beforeEach(async () => {
        // Clean up any existing test data
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist
        }

        // Initialize storage manager
        storage = new StorageManager({ dataDir: testDir });

        // Initialize retrieval engine with storage manager
        engine = new RetrievalEngine({ storageManager: storage });
    });

    afterEach(async () => {
        // Clean up test data
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist
        }
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(engine).toBeDefined();
            expect(engine.storageManager).toBe(storage);
            expect(engine.maxResults).toBe(10);
            expect(engine.minSimilarity).toBe(0.5);
        });

        test('should initialize with custom configuration', () => {
            const customEngine = new RetrievalEngine({
                storageManager: storage,
                maxResults: 25,
                minSimilarity: 0.7
            });
            expect(customEngine.maxResults).toBe(25);
            expect(customEngine.minSimilarity).toBe(0.7);
        });
    });

    describe('Basic Search Functionality', () => {
        beforeEach(async () => {
            // Ensure directories exist
            await fs.mkdir(testDir, { recursive: true });
            await fs.mkdir(path.join(testDir, 'memories'), { recursive: true });
            await fs.mkdir(path.join(testDir, 'indexes'), { recursive: true });
            
            // Add test memories
            const testMemories = [
                {
                    id: 'test-memory-1',
                    content: 'I have a dog named Buddy',
                    importance: 3,
                    category: 'personal',
                    timestamp: new Date().toISOString(),
                    keywords: ['dog', 'pet', 'family'],
                    metadata: { source: 'user_input' }
                },
                {
                    id: 'test-memory-2',
                    content: 'Meeting with team at 2 PM',
                    importance: 2,
                    category: 'work',
                    timestamp: new Date().toISOString(),
                    keywords: ['meeting', 'team', 'schedule'],
                    metadata: { source: 'calendar' }
                },
                {
                    id: 'test-memory-3',
                    content: 'Grocery shopping list: milk, bread, eggs',
                    importance: 1,
                    category: 'personal',
                    timestamp: new Date().toISOString(),
                    keywords: ['grocery', 'shopping', 'list'],
                    metadata: { source: 'notes' }
                }
            ];

            for (const memory of testMemories) {
                await storage.storeMemory(memory);
            }
        });

        test('should search with empty query', async () => {
            const results = await engine.search('');
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        test('should search with simple query', async () => {
            const results = await engine.search('dog');
            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].content).toContain('dog');
        });

        test('should filter by category', async () => {
            // Debug: Check what memories are actually stored
            const allMemories = await storage.getAllMemories();
            console.log('All memories in storage:', JSON.stringify(allMemories, null, 2));
            
            const results = await engine.search('', { category: 'work' });
            console.log('Search results for category "work":', results);
            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.category).toContain('work');
            });
        });

        test('should filter by minimum importance', async () => {
            const results = await engine.search('', { minImportance: 2 });
            expect(results).toBeDefined();
            results.forEach(result => {
                expect(result.importance).toBeGreaterThanOrEqual(2);
            });
        });

        test('should apply limit to results', async () => {
            const results = await engine.search('', { limit: 2 });
            expect(results.length).toBeLessThanOrEqual(2);
        });
    });

    describe('semanticSearch Method', () => {
        test('should perform semantic search with basic functionality', async () => {
            const testMemories = [
                { content: 'I have a dog named Buddy', importance: 3, category: 'personal', timestamp: new Date().toISOString() },
                { content: 'My dog Buddy loves to play', importance: 2, category: 'personal', timestamp: new Date().toISOString() },
                { content: 'Cat sleeping on the couch', importance: 1, category: 'personal', timestamp: new Date().toISOString() }
            ];
            
            const results = await engine.semanticSearch('dog', testMemories);
            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.similarity).toBeDefined();
                expect(result.relevance).toBeDefined();
                expect(result.similarity).toBeGreaterThanOrEqual(engine.minSimilarity);
            });
        });
    });
});
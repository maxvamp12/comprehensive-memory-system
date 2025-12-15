const ContextDetector = require('./core/context-detector');
const StorageManager = require('./core/storage-manager');
const RetrievalEngine = require('./core/retrieval-engine');
const EntityRecognizer = require('./nlp/entity-recognizer');
const RelationshipMapper = require('./nlp/relationship-mapper');
const TemporalAnalyzer = require('./nlp/temporal-analyzer');
const MemoryConsolidator = require('./core/memory-consolidator');
const ResponseGenerator = require('./integration/response-generator');
const MemoryIntegrator = require('./integration/memory-integrator');
const fs = require('fs').promises;
const path = require('path');

describe('Comprehensive Integration Test Suite - Phase 3', () => {
    let contextDetector;
    let storageManager;
    let retrievalEngine;
    let entityRecognizer;
    let relationshipMapper;
    let temporalAnalyzer;
    let memoryConsolidator;
    let responseGenerator;
    let memoryIntegrator;
    
    const testDir = path.join(__dirname, 'test-integration-data');
    const testMemoriesDir = path.join(testDir, 'memories');
    const testIndexesDir = path.join(testDir, 'indexes');

    beforeEach(async () => {
        // Clean up any existing test data
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist
        }

        // Initialize all components
        contextDetector = new ContextDetector();
        storageManager = new StorageManager({ dataDir: testDir });
        retrievalEngine = new RetrievalEngine({ storageManager: storageManager });
        entityRecognizer = new EntityRecognizer();
        relationshipMapper = new RelationshipMapper();
        temporalAnalyzer = new TemporalAnalyzer();
        memoryConsolidator = new MemoryConsolidator();
        responseGenerator = new ResponseGenerator();
        memoryIntegrator = new MemoryIntegrator();

        // Ensure directories exist
        await fs.mkdir(testDir, { recursive: true });
        await fs.mkdir(testMemoriesDir, { recursive: true });
        await fs.mkdir(testIndexesDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test data
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist
        }
    });

    describe('End-to-End Memory Flow', () => {
        test('should process input through complete memory system pipeline', async () => {
            const inputText = "John works at Google and lives in California. He has an important project meeting on December 25th, 2024.";
            
            // Step 1: Context Detection
            const contextResult = contextDetector.detectInformation(inputText);
            expect(contextResult).toBeDefined();
            expect(contextResult.entities).toBeDefined();
            expect(contextResult.importanceScore).toBeGreaterThan(0);

            // Step 2: Entity Recognition
            const entities = entityRecognizer.recognize(inputText);
            expect(entities).toBeDefined();
            expect(entities.entities).toBeDefined();

            // Step 3: Temporal Analysis
            const dates = temporalAnalyzer.extractDates(inputText);
            expect(dates).toBeDefined();
            expect(Array.isArray(dates)).toBe(true);

            // Step 4: Create Memory Object
            const memory = {
                id: `test-${Date.now()}`,
                content: inputText,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.9,
                entities: entities.entities,
                categories: ['work', 'personal'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            // Step 5: Store Memory
            await storageManager.storeMemory(memory);
            const storedMemories = await storageManager.getAllMemories();
            expect(storedMemories.length).toBeGreaterThan(0);
            expect(storedMemories[0].id).toBe(memory.id);

            // Step 6: Retrieve Memory
            const searchResults = await retrievalEngine.search('project meeting');
            expect(searchResults).toBeDefined();
            expect(searchResults.length).toBeGreaterThan(0);

            // Step 7: Memory Integration
            const integrationResult = memoryIntegrator.integrate('Tell me about the project meeting', searchResults);
            expect(integrationResult).toBeDefined();
            expect(integrationResult.relevantMemories.length).toBeGreaterThan(0);
            expect(integrationResult.integrationScore).toBeGreaterThan(0);

            // Step 8: Response Generation
            const response = responseGenerator.generateResponse('Tell me about the project meeting', integrationResult.relevantMemories);
            expect(response).toBeDefined();
            expect(response.text).toBeDefined();
            expect(response.confidence).toBeGreaterThan(0);
            expect(response.sources).toBeDefined();
        });

        test('should handle multiple memories in sequence', async () => {
            const testInputs = [
                "John works at Google as a software engineer.",
                "He lives in California and loves hiking.",
                "Important: Project deadline is December 31st, 2024.",
                "Team meeting every Tuesday at 2 PM."
            ];

            for (const input of testInputs) {
                const contextResult = contextDetector.detectInformation(input);
                const entities = entityRecognizer.recognize(input);
                const dates = temporalAnalyzer.extractDates(input);

                const memory = {
                    id: `test-${Date.now()}-${Math.random()}`,
                    content: input,
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: contextResult.importanceScore,
                    confidence: 0.85,
                    entities: entities.entities,
                    categories: ['work', 'personal'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };

                await storageManager.storeMemory(memory);
            }

            const allMemories = await storageManager.getAllMemories();
            expect(allMemories.length).toBe(4);

            const searchResults = await retrievalEngine.search('project');
            expect(searchResults.length).toBeGreaterThan(0);
        });
    });

    describe('Phase 1 Components Integration', () => {
        test('should integrate Context Detector with Storage Manager', async () => {
            const testText = "This is an important work-related reminder about the project.";
            
            const contextResult = contextDetector.detectInformation(testText);
            expect(contextResult.importanceScore).toBeGreaterThan(0.5);

            const memory = {
                id: `context-test-${Date.now()}`,
                content: testText,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.8,
                entities: contextResult.entities,
                categories: ['work', 'reminder'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            await storageManager.storeMemory(memory);
            const stored = await storageManager.getMemory(memory.id);
            expect(stored).toBeDefined();
            expect(stored.importanceScore).toBe(contextResult.importanceScore);
        });

        test('should integrate Storage Manager with Retrieval Engine', async () => {
            const testMemories = [
                {
                    id: 'storage-test-1',
                    content: 'Team meeting scheduled for tomorrow',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.9,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'storage-test-2',
                    content: 'Personal doctor appointment on Friday',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.6,
                    confidence: 0.8,
                    entities: {},
                    categories: ['personal'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            const searchResults = await retrievalEngine.search('meeting');
            expect(searchResults.length).toBeGreaterThan(0);
            
            const categoryResults = await retrievalEngine.search('', { category: 'work' });
            expect(categoryResults.length).toBeGreaterThan(0);
            categoryResults.forEach(result => {
                expect(result.categories).toContain('work');
            });
        });

        test('should integrate Retrieval Engine with Memory Consolidator', async () => {
            const similarMemories = [
                {
                    id: 'consolidate-1',
                    content: 'Project meeting tomorrow at 2 PM',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.8,
                    confidence: 0.9,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'consolidate-2',
                    content: 'Tomorrow at 2 PM project meeting',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'consolidate-3',
                    content: 'Different topic: grocery shopping list',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.5,
                    confidence: 0.7,
                    entities: {},
                    categories: ['personal'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of similarMemories) {
                await storageManager.storeMemory(memory);
            }

            const allMemories = await storageManager.getAllMemories();
            const consolidated = memoryConsolidator.consolidate(allMemories);
            
            expect(consolidated).toBeDefined();
            expect(consolidated.length).toBeLessThanOrEqual(allMemories.length);
        });
    });

    describe('Phase 2 Components Integration', () => {
        test('should integrate Entity Recognizer with Relationship Mapper', () => {
            const testText = "John works at Google and lives in California with his friend Mary.";
            
            const entities = entityRecognizer.recognize(testText);
            expect(entities).toBeDefined();
            expect(entities.entities).toBeDefined();
            expect(entities.entities.people).toBeDefined();
            expect(entities.entities.organizations).toBeDefined();
            expect(entities.entities.places).toBeDefined();

            const relationships = relationshipMapper.mapRelationships(testText, entities.entities);
            expect(relationships).toBeDefined();
            expect(Array.isArray(relationships)).toBe(true);

            // Check for specific relationship types if entities found
            if (entities.entities.people.length > 0 && entities.entities.organizations.length > 0) {
                expect(relationships.length).toBeGreaterThan(0);
                const workRelation = relationships.find(r => r.type === 'works_at');
                expect(workRelation).toBeDefined();
            }
            if (entities.entities.people.length > 0 && entities.entities.places.length > 0) {
                const locationRelation = relationships.find(r => r.type === 'lives_in');
                expect(locationRelation).toBeDefined();
            }
        });

        test('should integrate Temporal Analyzer with Entity Recognizer', () => {
            const testText = "Meeting on December 25th, 2024 at 3 PM. Deadline is January 15th, 2025.";
            
            const entities = entityRecognizer.recognize(testText);
            const dates = temporalAnalyzer.extractDates(testText);
            
            expect(entities).toBeDefined();
            expect(entities.entities.dates).toBeDefined();
            expect(dates).toBeDefined();
            expect(Array.isArray(dates)).toBe(true);

            if (dates.length > 0) {
                const dateStrings = dates.map(d => d.toString());
                expect(dateStrings.some(d => d.includes('2024') || d.includes('2025'))).toBe(true);
            }
        });

        test('should handle complex NLP processing pipeline', () => {
            const complexText = "Dr. Sarah Johnson, CEO of TechCorp, will present at the conference in San Francisco on March 15th, 2024. She will meet with John Smith from 2-4 PM.";
            
            // Entity Recognition
            const entities = entityRecognizer.recognize(complexText);
            expect(entities).toBeDefined();
            expect(entities.entities.people).toBeDefined();
            expect(entities.entities.organizations).toBeDefined();
            expect(entities.entities.places).toBeDefined();

            // Relationship Mapping
            const relationships = relationshipMapper.mapRelationships(complexText, entities.entities);
            expect(relationships).toBeDefined();
            expect(Array.isArray(relationships)).toBe(true);

            // Temporal Analysis
            const dates = temporalAnalyzer.extractDates(complexText);
            expect(dates).toBeDefined();
            expect(Array.isArray(dates)).toBe(true);

            if (dates.length > 0) {
                const temporalRelations = relationships.filter(r => 
                    r.type && (r.type.includes('time') || r.type.includes('date') || r.type.includes('when'))
                );
                expect(temporalRelations.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Phase 1 and Phase 2 Integration', () => {
        test('should integrate NLP components with storage and retrieval', async () => {
            const testText = "Apple Inc. announced new iPhone features on September 12th, 2024. Tim Cook presented at the event.";
            
            // NLP Processing
            const entities = entityRecognizer.recognize(testText);
            const relationships = relationshipMapper.mapRelationships(testText, entities.entities);
            const dates = temporalAnalyzer.extractDates(testText);
            const contextResult = contextDetector.detectInformation(testText);

            // Create enhanced memory with NLP data
            const memory = {
                id: `nlp-integration-${Date.now()}`,
                content: testText,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.9,
                entities: entities.entities,
                categories: ['technology', 'business'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            // Store memory
            await storageManager.storeMemory(memory);

            // Retrieve with enhanced query
            const searchResults = await retrievalEngine.search('iPhone features');
            expect(searchResults.length).toBeGreaterThan(0);

            // Verify NLP-enhanced retrieval
            const resultsWithEntities = searchResults.filter(r => 
                r.entities && Object.keys(r.entities).length > 0
            );
            expect(resultsWithEntities.length).toBeGreaterThan(0);
        });

        test('should generate responses using integrated NLP data', async () => {
            const testText = "Microsoft will release Windows 12 in October 2024. Satya Nadella is the CEO.";
            
            // Process through complete pipeline
            const entities = entityRecognizer.recognize(testText);
            const contextResult = contextDetector.detectInformation(testText);
            
            const memory = {
                id: `response-test-${Date.now()}`,
                content: testText,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.9,
                entities: entities.entities,
                categories: ['technology', 'business'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            await storageManager.storeMemory(memory);

            // Integrate and generate response
            const integrationResult = memoryIntegrator.integrate('Tell me about Windows 12', [memory]);
            const response = responseGenerator.generateResponse('Tell me about Windows 12', integrationResult.relevantMemories);

            expect(response.text).toBeDefined();
            expect(response.text.length).toBeGreaterThan(0);
            expect(response.confidence).toBeGreaterThan(0);
            expect(response.sources).toBeDefined();
            expect(response.sources.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle empty or invalid input gracefully', async () => {
            // Empty input
            const emptyContext = contextDetector.detectInformation("");
            expect(emptyContext.entities).toBeDefined();
            expect(emptyContext.importanceScore).toBe(0);

            // Invalid memory object
            await expect(storageManager.storeMemory({})).rejects.toThrow();
            
            // Non-existent memory
            const nonExistent = await storageManager.getMemory('non-existent-id');
            expect(nonExistent).toBeNull();

            // Empty search
            const emptyResults = await retrievalEngine.search('');
            expect(emptyResults).toBeDefined();
            expect(Array.isArray(emptyResults)).toBe(true);
        });

        test('should handle malformed memory data', async () => {
            const malformedMemories = [
                { id: 'malformed-1', content: 'Missing required fields' },
                { id: 'malformed-2', content: 'Has content but no timestamp' },
                { id: 'malformed-3', timestamp: Date.now(), content: 'Has timestamp but no content' }
            ];

            for (const memory of malformedMemories) {
                await expect(storageManager.storeMemory(memory)).rejects.toThrow();
            }
        });

        test('should handle search with invalid parameters', async () => {
            // Add test memory
            const testMemory = {
                id: 'search-test',
                content: 'Test memory for search',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.5,
                confidence: 0.8,
                entities: {},
                categories: ['test'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };
            await storageManager.storeMemory(testMemory);

            // Invalid category filter
            const invalidCategoryResults = await retrievalEngine.search('', { category: 'nonexistent' });
            expect(invalidCategoryResults).toBeDefined();
            expect(invalidCategoryResults.length).toBe(0);

            // Negative limit
            const negativeLimitResults = await retrievalEngine.search('', { limit: -1 });
            expect(negativeLimitResults).toBeDefined();
            expect(negativeLimitResults.length).toBe(0);
        });

        test('should handle memory corruption gracefully', async () => {
            // Create valid memory
            const validMemory = {
                id: 'corruption-test',
                content: 'Valid memory content',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.7,
                confidence: 0.8,
                entities: {},
                categories: ['test'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };
            await storageManager.storeMemory(validMemory);

            // Simulate corruption by modifying stored file
            const memoryFile = path.join(testMemoriesDir, `${validMemory.id}.json`);
            const corruptedContent = JSON.stringify({ ...validMemory, content: 'CORRUPTED_CONTENT' });
            await fs.writeFile(memoryFile, corruptedContent);

            // Try to retrieve corrupted memory
            const retrieved = await storageManager.getMemory(validMemory.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.content).toBe('CORRUPTED_CONTENT');
        });
    });

    describe('Real-World Usage Scenarios', () => {
        test('should handle professional work scenario', async () => {
            const workScenario = `
                Important: Project Alpha deadline moved to December 31st, 2024.
                Team meeting scheduled for every Tuesday at 2 PM in Conference Room A.
                Sarah Johnson from Engineering team will lead the development.
                Budget allocation approved: $50,000 for project resources.
            `;

            const contextResult = contextDetector.detectInformation(workScenario);
            const entities = entityRecognizer.recognize(workScenario);
            const dates = temporalAnalyzer.extractDates(workScenario);

            const memory = {
                id: `work-scenario-${Date.now()}`,
                content: workScenario,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.95,
                entities: entities.entities,
                categories: ['work', 'project', 'important'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            await storageManager.storeMemory(memory);

            // Test various search queries
            const deadlineResults = await retrievalEngine.search('deadline');
            expect(deadlineResults.length).toBeGreaterThan(0);

            const meetingResults = await retrievalEngine.search('meeting');
            expect(meetingResults.length).toBeGreaterThan(0);

            const budgetResults = await retrievalEngine.search('budget');
            expect(budgetResults.length).toBeGreaterThan(0);
        });

        test('should handle personal life scenario', async () => {
            const personalScenario = `
                Remember: Doctor appointment on Friday, January 10th, 2025 at 10:30 AM.
                Grocery list: milk, bread, eggs, fruits, vegetables.
                Anniversary dinner reservation at Italian Restaurant for February 14th.
                Gym membership renewal due by end of month.
            `;

            const contextResult = contextDetector.detectInformation(personalScenario);
            const entities = entityRecognizer.recognize(personalScenario);
            const dates = temporalAnalyzer.extractDates(personalScenario);

            const memory = {
                id: `personal-scenario-${Date.now()}`,
                content: personalScenario,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.9,
                entities: entities.entities,
                categories: ['personal', 'health', 'reminder'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            await storageManager.storeMemory(memory);

            // Test personal queries
            const appointmentResults = await retrievalEngine.search('doctor appointment');
            expect(appointmentResults.length).toBeGreaterThan(0);

            const groceryResults = await retrievalEngine.search('grocery list');
            expect(groceryResults.length).toBeGreaterThan(0);

            const anniversaryResults = await retrievalEngine.search('anniversary');
            expect(anniversaryResults.length).toBeGreaterThan(0);
        });

        test('should handle mixed personal and professional scenario', async () => {
            const mixedScenario = `
                Work: Remote work policy updated - every Wednesday is work-from-home day.
                Personal: Kids' school play on December 20th at 6 PM in the auditorium.
                Work: Quarterly review meeting scheduled for January 5th, 2025.
                Personal: Family vacation to Hawaii planned for March 15-22, 2025.
            `;

            const contextResult = contextDetector.detectInformation(mixedScenario);
            const entities = entityRecognizer.recognize(mixedScenario);
            const dates = temporalAnalyzer.extractDates(mixedScenario);

            const memory = {
                id: `mixed-scenario-${Date.now()}`,
                content: mixedScenario,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.92,
                entities: entities.entities,
                categories: ['work', 'personal', 'family'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            await storageManager.storeMemory(memory);

            // Test mixed queries
            const remoteWorkResults = await retrievalEngine.search('remote work');
            expect(remoteWorkResults.length).toBeGreaterThan(0);

            const schoolResults = await retrievalEngine.search('school play');
            expect(schoolResults.length).toBeGreaterThan(0);

            const vacationResults = await retrievalEngine.search('family vacation');
            expect(vacationResults.length).toBeGreaterThan(0);
        });
    });

    describe('Performance Tests', () => {
        test('should handle multiple memories efficiently', async () => {
            const startTime = Date.now();
            const memoryCount = 50;

            for (let i = 0; i < memoryCount; i++) {
                const testText = `Memory ${i + 1}: This is test content for memory number ${i + 1}. Created on ${new Date().toISOString()}.`;
                
                const contextResult = contextDetector.detectInformation(testText);
                const entities = entityRecognizer.recognize(testText);

                const memory = {
                    id: `perf-test-${i}`,
                    content: testText,
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: contextResult.importanceScore,
                    confidence: 0.8,
                    entities: entities.entities,
                    categories: ['test', 'performance'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };

                await storageManager.storeMemory(memory);
            }

            const storageTime = Date.now() - startTime;
            console.log(`Storage time for ${memoryCount} memories: ${storageTime}ms`);

            // Test retrieval performance
            const retrievalStart = Date.now();
            const searchResults = await retrievalEngine.search('test', { limit: 50 });
            const retrievalTime = Date.now() - retrievalStart;
            
            console.log(`Retrieval time: ${retrievalTime}ms`);
            console.log(`Results found: ${searchResults.length}`);

            expect(searchResults.length).toBe(memoryCount);
            expect(storageTime).toBeLessThan(5000); // Should complete in under 5 seconds
            expect(retrievalTime).toBeLessThan(1000); // Should complete in under 1 second
        });

        test('should handle complex queries efficiently', async () => {
            // Create test data with various categories and importance levels
            const testMemories = [];
            for (let i = 0; i < 20; i++) {
                const category = i % 3 === 0 ? 'work' : i % 3 === 1 ? 'personal' : 'important';
                const importance = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
                
                const testText = `${category} memory ${i + 1} with importance ${importance.toFixed(2)}. Created on ${new Date().toISOString()}.`;
                
                const memory = {
                    id: `complex-test-${i}`,
                    content: testText,
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: importance,
                    confidence: 0.8,
                    entities: {},
                    categories: [category],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };

                testMemories.push(memory);
            }

            // Store all memories
            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            // Test complex queries with filters
            const complexQueryStart = Date.now();
            
            const categoryResults = await retrievalEngine.search('', { category: 'work' });
            const importanceResults = await retrievalEngine.search('', { minImportance: 0.8 });
            const limitedResults = await retrievalEngine.search('', { limit: 5 });
            
            const complexQueryTime = Date.now() - complexQueryStart;
            
            console.log(`Complex query time: ${complexQueryTime}ms`);
            console.log(`Category results: ${categoryResults.length}`);
            console.log(`Importance results: ${importanceResults.length}`);
            console.log(`Limited results: ${limitedResults.length}`);

            expect(categoryResults.length).toBeGreaterThan(0);
            expect(importanceResults.length).toBeGreaterThan(0);
            expect(limitedResults.length).toBeLessThanOrEqual(5);
            expect(complexQueryTime).toBeLessThan(1000); // Should complete in under 1 second
        });

        test('should handle memory consolidation performance', async () => {
            // Create duplicate memories
            const duplicateMemories = [];
            const baseText = "This is a duplicate memory for testing consolidation performance.";
            
            for (let i = 0; i < 10; i++) {
                const memory = {
                    id: `duplicate-${i}`,
                    content: baseText,
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['test'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };
                duplicateMemories.push(memory);
            }

            // Add some unique memories
            for (let i = 0; i < 5; i++) {
                const memory = {
                    id: `unique-${i}`,
                    content: `This is a unique memory number ${i + 1}.`,
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.6,
                    confidence: 0.8,
                    entities: {},
                    categories: ['test'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                };
                duplicateMemories.push(memory);
            }

            // Store all memories
            for (const memory of duplicateMemories) {
                await storageManager.storeMemory(memory);
            }

            // Test consolidation performance
            const consolidationStart = Date.now();
            const allMemories = await storageManager.getAllMemories();
            const consolidated = memoryConsolidator.consolidate(allMemories);
            const consolidationTime = Date.now() - consolidationStart;
            
            console.log(`Consolidation time: ${consolidationTime}ms`);
            console.log(`Original memories: ${allMemories.length}`);
            console.log(`Consolidated memories: ${consolidated.length}`);

            expect(consolidated.length).toBeLessThan(allMemories.length);
            expect(consolidationTime).toBeLessThan(2000); // Should complete in under 2 seconds
        });
    });

    describe('Memory Normalization Tests', () => {
        test('should normalize category fields consistently', async () => {
            // Test memories with different category formats
            const testMemories = [
                {
                    id: 'category-test-1',
                    content: 'Memory with single category',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['work'], // Single category
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'category-test-2',
                    content: 'Memory with multiple categories',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['personal', 'reminder'], // Multiple categories
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            // Verify retrieval works with both formats
            const allResults = await retrievalEngine.search('');
            expect(allResults.length).toBe(2);

            // Test category filtering
            const workResults = await retrievalEngine.search('', { category: 'work' });
            const personalResults = await retrievalEngine.search('', { category: 'personal' });
            
            expect(workResults.length).toBe(1);
            expect(personalResults.length).toBe(1);
        });

        test('should handle entity normalization', async () => {
            const testText = "John Smith works at Google and lives in California.";
            const entities = entityRecognizer.recognize(testText);
            
            expect(entities).toBeDefined();
            expect(entities.entities.people).toBeDefined();
            expect(entities.entities.organizations).toBeDefined();
            expect(entities.entities.places).toBeDefined();
            
            // Verify entities are properly structured
            if (entities.entities.people.length > 0) {
                expect(entities.entities.people[0]).toHaveProperty('text');
                expect(entities.entities.people[0]).toHaveProperty('type');
                expect(entities.entities.people[0]).toHaveProperty('confidence');
            }
            
            if (entities.entities.organizations.length > 0) {
                expect(entities.entities.organizations[0]).toHaveProperty('text');
                expect(entities.entities.organizations[0]).toHaveProperty('type');
                expect(entities.entities.organizations[0]).toHaveProperty('confidence');
            }
            
            if (entities.entities.places.length > 0) {
                expect(entities.entities.places[0]).toHaveProperty('text');
                expect(entities.entities.places[0]).toHaveProperty('type');
                expect(entities.entities.places[0]).toHaveProperty('confidence');
            }
        });
    });

    describe('NLP Integration with Storage', () => {
        test('should store and retrieve memories with NLP data', async () => {
            const testText = "Dr. Emily Chen from Stanford University published a research paper on artificial intelligence on March 15th, 2024.";
            
            // Process with NLP
            const entities = entityRecognizer.recognize(testText);
            const relationships = relationshipMapper.mapRelationships(testText, entities.entities);
            const dates = temporalAnalyzer.extractDates(testText);
            const contextResult = contextDetector.detectInformation(testText);

            const memory = {
                id: `nlp-storage-${Date.now()}`,
                content: testText,
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: contextResult.importanceScore,
                confidence: 0.9,
                entities: entities.entities,
                categories: ['academic', 'research'],
                storedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            // Store memory
            await storageManager.storeMemory(memory);

            // Retrieve memory
            const retrieved = await storageManager.getMemory(memory.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.entities).toEqual(entities.entities);
            expect(retrieved.content).toBe(testText);
        });

        test('should enhance retrieval with NLP-processed memories', async () => {
            const testMemories = [
                {
                    id: 'nlp-retrieval-1',
                    content: 'Apple Inc. announced new iPhone features on September 12th, 2024.',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.8,
                    confidence: 0.9,
                    entities: entityRecognizer.recognize('Apple Inc. announced new iPhone features on September 12th, 2024.').entities,
                    categories: ['technology'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'nlp-retrieval-2',
                    content: 'Google released Android 15 update in October 2024.',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: entityRecognizer.recognize('Google released Android 15 update in October 2024.').entities,
                    categories: ['technology'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            // Test enhanced retrieval
            const appleResults = await retrievalEngine.search('iPhone features');
            const googleResults = await retrievalEngine.search('Android update');
            
            expect(appleResults.length).toBeGreaterThan(0);
            expect(googleResults.length).toBeGreaterThan(0);
            
            // Verify NLP-enhanced results contain entity information
            appleResults.forEach(result => {
                if (result.entities) {
                    expect(Object.keys(result.entities).length).toBeGreaterThan(0);
                }
            });
        });
    });

    describe('Retrieval with NLP-Enhanced Memories', () => {
        test('should retrieve memories based on semantic meaning', async () => {
            const testMemories = [
                {
                    id: 'semantic-1',
                    content: 'Team meeting scheduled for tomorrow at 2 PM',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.8,
                    confidence: 0.9,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'semantic-2',
                    content: 'Tomorrow at 2 PM we have a team gathering',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'semantic-3',
                    content: 'Different topic: grocery shopping list',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.5,
                    confidence: 0.7,
                    entities: {},
                    categories: ['personal'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            // Test semantic retrieval
            const meetingResults = await retrievalEngine.search('team meeting');
            expect(meetingResults.length).toBeGreaterThan(0);
            
            // Should find both semantically similar memories
            const meetingContents = meetingResults.map(r => r.content.toLowerCase());
            expect(meetingContents.some(c => c.includes('team meeting'))).toBe(true);
            expect(meetingContents.some(c => c.includes('team gathering'))).toBe(true);
        });

        test('should handle temporal queries with NLP data', async () => {
            const testMemories = [
                {
                    id: 'temporal-1',
                    content: 'Project deadline on December 31st, 2024',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.9,
                    confidence: 0.9,
                    entities: {},
                    categories: ['work', 'deadline'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'temporal-2',
                    content: 'Team meeting every Tuesday at 2 PM',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.7,
                    confidence: 0.8,
                    entities: {},
                    categories: ['work'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                },
                {
                    id: 'temporal-3',
                    content: 'Vacation planned for July 15th, 2025',
                    timestamp: new Date().toISOString(),
                    isDeclarative: true,
                    importanceScore: 0.8,
                    confidence: 0.8,
                    entities: {},
                    categories: ['personal'],
                    storedAt: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                }
            ];

            for (const memory of testMemories) {
                await storageManager.storeMemory(memory);
            }

            // Test temporal queries
            const deadlineResults = await retrievalEngine.search('deadline');
            expect(deadlineResults.length).toBeGreaterThan(0);

            const meetingResults = await retrievalEngine.search('meeting');
            expect(meetingResults.length).toBeGreaterThan(0);

            const vacationResults = await retrievalEngine.search('vacation');
            expect(vacationResults.length).toBeGreaterThan(0);
        });
    });
});
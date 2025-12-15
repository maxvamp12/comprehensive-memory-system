const ContextDetector = require('./core/context-detector');
const StorageManager = require('./core/storage-manager');
const RetrievalEngine = require('./core/retrieval-engine');
const EntityRecognizer = require('./nlp/entity-recognizer');
const RelationshipMapper = require('./nlp/relationship-mapper');
const TemporalAnalyzer = require('./nlp/temporal-analyzer');
const MemoryConsolidator = require('./core/memory-consolidator');
const ResponseGenerator = require('./integration/response-generator');
const MemoryIntegrator = require('./integration/memory-integrator');

console.log('=== COMPREHENSIVE MEMORY SYSTEM TEST SUITE ===\n');

async function runTests() {

// Test 1: Context Detector
console.log('1. Testing Context Detector...');
const contextDetector = new ContextDetector();
const testContext = "John works at Google and lives in California. He has a project meeting on December 25th.";
const contextResult = contextDetector.detectInformation(testContext);
console.log('✅ Context detection working');
console.log('   - Entities found:', Object.keys(contextResult.entities).length);
console.log('   - Importance score:', contextResult.importance);

// Test 2: Entity Recognizer
console.log('\n2. Testing Entity Recognizer...');
const logger = { log: (message) => console.log(`[DEBUG] ${message}`) };
const entityRecognizer = new EntityRecognizer({ logger });
const entities = entityRecognizer.recognize(testContext);
const topEntities = entityRecognizer.getTopEntities(entities, 3);
console.log('✅ Entity recognition working');
console.log('   - Top entities:', topEntities.length);

// Test 3: Relationship Mapper
console.log('\n3. Testing Relationship Mapper...');
const relationshipMapper = new RelationshipMapper();
const relationships = relationshipMapper.mapRelationships(testContext, entities);
console.log('✅ Relationship mapping working');
console.log('   - Relationships found:', relationships.length);

// Test 4: Temporal Analyzer
console.log('\n4. Testing Temporal Analyzer...');
const temporalAnalyzer = new TemporalAnalyzer();
const dates = temporalAnalyzer.extractDates(testContext);
console.log('✅ Temporal analysis working');
console.log('   - Dates found:', dates.length);

// Test 5: Memory Consolidator
console.log('\n5. Testing Memory Consolidator...');
const memoryConsolidator = new MemoryConsolidator();
const testMemories = [
    { id: 1, content: "Duplicate memory", timestamp: Date.now() },
    { id: 2, content: "Duplicate memory", timestamp: Date.now() + 1000 },
    { id: 3, content: "Unique memory", timestamp: Date.now() + 2000 }
];
const consolidated = memoryConsolidator.consolidate(testMemories);
console.log('✅ Memory consolidation working');
console.log('   - Original memories:', testMemories.length);
console.log('   - Consolidated memories:', consolidated.length);

// Test 6: Storage Manager
console.log('\n6. Testing Storage Manager...');
const storageManager = new StorageManager();
const testMemory = {
    id: Date.now(),
    content: "Test memory for storage",
    timestamp: Date.now(),
    entities: entities,
    importance: 0.8
};
storageManager.storeMemory(testMemory)
    .then(() => {
        console.log('✅ Storage working');
        return storageManager.getAllMemories();
    })
    .then(retrieved => {
        console.log('   - Memories stored:', retrieved.length);
    });

// Test 7: Retrieval Engine
console.log('\n7. Testing Retrieval Engine...');
const retrievalEngine = new RetrievalEngine({ storageManager: storageManager });
const query = "project meeting";
retrievalEngine.search(query, {})
    .then(results => {
        console.log('✅ Retrieval working');
        console.log('   - Query:', query);
        console.log('   - Results found:', results.length);
    })
    .catch(error => {
        console.log('❌ Retrieval failed:', error.message);
    });

// Test 8: Memory Integrator
console.log('\n8. Testing Memory Integrator...');
const memoryIntegrator = new MemoryIntegrator();
const integrationResult = memoryIntegrator.integrate(query, [testMemory]);
console.log('✅ Memory integration working');
console.log('   - Integration score:', integrationResult.integrationScore);

// Test 9: Response Generator
console.log('\n9. Testing Response Generator...');
const responseGenerator = new ResponseGenerator();
storageManager.getAllMemories()
    .then(memories => {
        const response = responseGenerator.generateResponse(query, memories);
        console.log('✅ Response generation working');
        console.log('   - Response text:', response.text.substring(0, 50) + '...');
        console.log('   - Confidence:', response.confidence);
    });
}

// Run the tests
runTests();
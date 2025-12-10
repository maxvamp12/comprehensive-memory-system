const VectorEmbeddingService = require('./core/vector-embedding-service');
const RetrievalEngine = require('./core/retrieval-engine');
const StorageManager = require('./core/storage-manager');

async function testVectorEmbeddings() {
    console.log('🚀 Testing Vector Embeddings...\n');
    
    try {
        // Initialize services
        const embeddingService = new VectorEmbeddingService();
        await embeddingService.initialize();
        
        const storageManager = new StorageManager();
        const retrievalEngine = new RetrievalEngine({ 
            storageManager,
            embeddingService 
        });
        
        console.log('✅ Services initialized successfully');
        
        // Test embeddings
        const testMemories = [
            {
                id: 'test-memory-1',
                content: 'I went to San Francisco last summer and visited the Golden Gate Bridge',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.8,
                confidence: 0.9,
                entities: {
                    people: [],
                    places: ['San Francisco', 'Golden Gate Bridge'],
                    organizations: [],
                    dates: [],
                    money: [],
                    numbers: []
                },
                categories: ['travel', 'personal']
            },
            {
                id: 'test-memory-2',
                content: 'Working on a project downtown near the office building',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.6,
                confidence: 0.8,
                entities: {
                    people: [],
                    places: ['downtown', 'office building'],
                    organizations: [],
                    dates: [],
                    money: [],
                    numbers: []
                },
                categories: ['work', 'professional']
            },
            {
                id: 'test-memory-3',
                content: 'Meeting with the team at headquarters tomorrow at 3 PM',
                timestamp: new Date().toISOString(),
                isDeclarative: true,
                importanceScore: 0.7,
                confidence: 0.85,
                entities: {
                    people: ['team'],
                    places: ['headquarters'],
                    organizations: [],
                    dates: ['tomorrow at 3 PM'],
                    money: [],
                    numbers: []
                },
                categories: ['work', 'meeting']
            }
        ];
        
        // Store memories and generate embeddings
        console.log('\n📝 Storing memories and generating embeddings...');
        for (const memory of testMemories) {
            await storageManager.storeMemory(memory);
            console.log(`✅ Stored memory: ${memory.id}`);
        }
        
        // Test semantic search
        console.log('\n🔍 Testing semantic search...');
        const searchQuery = 'travel to California city';
        const results = await retrievalEngine.search(searchQuery, {
            useSemanticSearch: true,
            limit: 10
        });
        
        console.log(`\n📊 Search Results for "${searchQuery}":`);
        console.log(`Found ${results.length} results`);
        
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.content.substring(0, 80)}...`);
            console.log(`   Similarity: ${result.similarity?.toFixed(3) || 'N/A'}`);
            console.log(`   Relevance: ${result.relevance?.toFixed(3) || 'N/A'}`);
            console.log(`   Categories: ${result.categories.join(', ')}`);
        });
        
        // Test similarity calculation
        console.log('\n📏 Testing cosine similarity...');
        const embedding1 = await embeddingService.getEmbedding('I love programming in JavaScript');
        const embedding2 = await embeddingService.getEmbedding('Coding with JavaScript is fun');
        const embedding3 = await embeddingService.getEmbedding('I enjoy cooking Italian food');
        
        const similarity12 = await embeddingService.calculateCosineSimilarity(embedding1, embedding2);
        const similarity13 = await embeddingService.calculateCosineSimilarity(embedding1, embedding3);
        
        console.log(`Similarity between JS programming examples: ${similarity12.toFixed(3)}`);
        console.log(`Similarity between JS programming and cooking: ${similarity13.toFixed(3)}`);
        console.log(`✅ Expected JS programming examples to be more similar: ${similarity12 > similarity13 ? 'PASS' : 'FAIL'}`);
        
        console.log('\n🎉 Vector embedding test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Vector embedding test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testVectorEmbeddings()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testVectorEmbeddings };
const VectorEmbeddingService = require('./core/vector-embedding-service');

async function testDirectEmbedding() {
    console.log('🧪 Testing Direct Embedding Generation...\n');
    
    try {
        const embeddingService = new VectorEmbeddingService();
        await embeddingService.initialize();
        
        const testMemory = {
            id: 'direct-test-memory',
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
        };
        
        console.log('📝 Generating embedding for test memory...');
        const memoryWithEmbedding = await embeddingService.generateMemoryEmbedding(testMemory);
        
        console.log('✅ Embedding generated successfully!');
        console.log(`📊 Embedding dimensions: ${memoryWithEmbedding.embedding.length}`);
        console.log(`📊 Embedding preview: [${memoryWithEmbedding.embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);
        
        // Test similarity
        const embedding1 = await embeddingService.getEmbedding('I love programming in JavaScript');
        const embedding2 = await embeddingService.getEmbedding('Coding with JavaScript is fun');
        const embedding3 = await embeddingService.getEmbedding('I enjoy cooking Italian food');
        
        const similarity12 = await embeddingService.calculateCosineSimilarity(embedding1, embedding2);
        const similarity13 = await embeddingService.calculateCosineSimilarity(embedding1, embedding3);
        
        console.log(`\n📏 Similarity Tests:`);
        console.log(`JS Programming vs JS Programming: ${similarity12.toFixed(3)}`);
        console.log(`JS Programming vs Cooking: ${similarity13.toFixed(3)}`);
        console.log(`✅ Expected JS programming examples to be more similar: ${similarity12 > similarity13 ? 'PASS' : 'FAIL'}`);
        
        console.log('\n🎉 Direct embedding test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Direct embedding test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testDirectEmbedding()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testDirectEmbedding };
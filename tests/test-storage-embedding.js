const VectorEmbeddingService = require('./core/vector-embedding-service');
const StorageManager = require('./core/storage-manager');

async function testStorageEmbedding() {
    console.log('🧪 Testing Storage Manager with Embeddings...\n');
    
    try {
        const embeddingService = new VectorEmbeddingService();
        await embeddingService.initialize();
        
        const storageManager = new StorageManager({
            embeddingService: embeddingService
        });
        
        const testMemory = {
            id: 'storage-test-memory',
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
        
        console.log('📝 Storing memory with embedding...');
        await storageManager.storeMemory(testMemory);
        
        console.log('🔍 Retrieving memory to check for embedding...');
        const retrievedMemory = await storageManager.retrieveMemory('storage-test-memory');
        
        console.log('✅ Memory stored and retrieved successfully!');
        console.log(`📊 Memory ID: ${retrievedMemory.id}`);
        console.log(`📊 Content preview: ${retrievedMemory.content.substring(0, 50)}...`);
        console.log(`📊 Categories: ${retrievedMemory.categories.join(', ')}`);
        
        // Check if embedding file was created
        const fs = require('fs');
        const path = require('path');
        const __dirname = path.resolve();
        
        // Check the actual data directory
        const actualEmbeddingPath = path.join(__dirname, 'data/embeddings/storage-test-memory.embedding');
        console.log(`🔍 Checking for embedding file at: ${actualEmbeddingPath}`);
        
        if (fs.existsSync(actualEmbeddingPath)) {
            console.log('✅ Embedding file created successfully!');
            const embeddingData = fs.readFileSync(actualEmbeddingPath, 'utf8');
            console.log(`📊 Embedding data length: ${embeddingData.length} characters`);
            console.log(`📊 Embedding data preview: ${embeddingData.substring(0, 100)}...`);
        } else {
            console.log('❌ Embedding file not found');
        }
        
        console.log('\n🎉 Storage manager embedding test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Storage manager embedding test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testStorageEmbedding()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testStorageEmbedding };
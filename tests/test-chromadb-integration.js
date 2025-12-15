#!/usr/bin/env node

/**
 * Test script for ChromaDB integration
 */

const config = require('./config.json');
const StorageManager = require('./core/storage-manager').default || require('./core/storage-manager');
const VectorEmbeddingService = require('./core/vector-embedding-service').default || require('./core/vector-embedding-service');

async function testChromaDBIntegration() {
  console.log('🗃️ Testing ChromaDB Integration...');
  
  try {
    // Initialize components
    const embeddingService = new VectorEmbeddingService(config.embedding);
    await embeddingService.initialize();
    
    const storageManager = new StorageManager({
      ...config,
      embeddingService,
      chroma: config.chroma
    });
    
    // Initialize ChromaDB
    await storageManager.initialize();
    
    console.log('✅ ChromaDB service initialized successfully');
    
    // Create a test memory
    const testMemory = {
      id: `test-chroma-${Date.now()}`,
      content: 'This is a test memory for ChromaDB integration',
      timestamp: new Date().toISOString(),
      isDeclarative: true,
      importanceScore: 0.8,
      confidence: 0.9,
      categories: ['test', 'chromadb'],
      entities: {
        places: [],
        people: [],
        organizations: [],
        dates: [],
        money: [],
        numbers: []
      }
    };
    
    // Store the test memory
    console.log('📝 Storing test memory...');
    await storageManager.storeMemory(testMemory);
    console.log('✅ Memory stored successfully');
    
    // Retrieve the memory
    console.log('🔍 Retrieving test memory...');
    const retrievedMemory = await storageManager.retrieveMemory(testMemory.id);
    console.log('✅ Memory retrieved successfully');
    
    // Test semantic search
    console.log('🔎 Testing semantic search...');
    const searchResults = await storageManager.searchMemories('test memory for chroma', {
      useSemanticSearch: true,
      limit: 5,
      minSimilarity: 0.1
    });
    
    console.log('✅ Semantic search completed', { results: searchResults.length });
    
    // Clean up
    console.log('🧹 Cleaning up test memory...');
    await storageManager.deleteMemory(testMemory.id);
    console.log('✅ Test memory cleaned up');
    
    console.log('🎉 ChromaDB integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ ChromaDB integration test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testChromaDBIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testChromaDBIntegration };
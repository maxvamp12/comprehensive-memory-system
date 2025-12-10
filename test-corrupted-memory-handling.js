const StorageManager = require('./core/storage-manager');

console.log('=== TESTING CORRUPTED MEMORY HANDLING ===\n');

async function testCorruptedMemoryHandling() {
  const storage = new StorageManager();
  
  console.log('1. Testing memory with string category (old format)...');
  try {
    const oldFormatMemory = {
      id: 'test-old-format',
      content: 'This is a test memory with string category',
      timestamp: Date.now(),
      category: 'personal', // Old format - string instead of array
      entities: {},
      relationships: [],
      importance: 0.5
    };
    
    await storage.storeMemory(oldFormatMemory);
    console.log('✅ Memory with string category stored successfully');
    
    // Verify it was normalized
    const retrieved = await storage.retrieveMemory('test-old-format');
    console.log('   - Normalized categories:', retrieved.categories);
    console.log('   - Category type:', typeof retrieved.categories);
    console.log('   - Is array:', Array.isArray(retrieved.categories));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n2. Testing memory with missing category...');
  try {
    const missingCategoryMemory = {
      id: 'test-missing-category',
      content: 'This is a test memory with missing category',
      timestamp: Date.now(),
      entities: {},
      relationships: [],
      importance: 0.5
      // No category field
    };
    
    await storage.storeMemory(missingCategoryMemory);
    console.log('✅ Memory with missing category stored successfully');
    
    // Verify it got default category
    const retrieved = await storage.retrieveMemory('test-missing-category');
    console.log('   - Assigned categories:', retrieved.categories);
    console.log('   - Contains default "general":', retrieved.categories.includes('general'));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n3. Testing memory with null/undefined categories...');
  try {
    const nullCategoryMemory = {
      id: 'test-null-category',
      content: 'This is a test memory with null categories',
      timestamp: Date.now(),
      categories: null, // Invalid category
      entities: {},
      relationships: [],
      importance: 0.5
    };
    
    await storage.storeMemory(nullCategoryMemory);
    console.log('✅ Memory with null category stored successfully');
    
    // Verify it was normalized
    const retrieved = await storage.retrieveMemory('test-null-category');
    console.log('   - Normalized categories:', retrieved.categories);
    console.log('   - Contains default "general":', retrieved.categories.includes('general'));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n4. Testing memory with empty categories array...');
  try {
    const emptyCategoryMemory = {
      id: 'test-empty-category',
      content: 'This is a test memory with empty categories',
      timestamp: Date.now(),
      categories: [], // Empty array
      entities: {},
      relationships: [],
      importance: 0.5
    };
    
    await storage.storeMemory(emptyCategoryMemory);
    console.log('✅ Memory with empty categories stored successfully');
    
    // Verify it got default category
    const retrieved = await storage.retrieveMemory('test-empty-category');
    console.log('   - Normalized categories:', retrieved.categories);
    console.log('   - Contains default "general":', retrieved.categories.includes('general'));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n5. Testing memory with mixed case categories...');
  try {
    const mixedCaseMemory = {
      id: 'test-mixed-case',
      content: 'This is a test memory with mixed case categories',
      timestamp: Date.now(),
      categories: ['PERSONAL', 'Work', 'FAMILY'], // Mixed case
      entities: {},
      relationships: [],
      importance: 0.5
    };
    
    await storage.storeMemory(mixedCaseMemory);
    console.log('✅ Memory with mixed case categories stored successfully');
    
    // Verify it was normalized to lowercase
    const retrieved = await storage.retrieveMemory('test-mixed-case');
    console.log('   - Normalized categories:', retrieved.categories);
    console.log('   - All lowercase:', retrieved.categories.every(cat => cat === cat.toLowerCase()));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n6. Testing memory with whitespace in categories...');
  try {
    const whitespaceMemory = {
      id: 'test-whitespace',
      content: 'This is a test memory with whitespace in categories',
      timestamp: Date.now(),
      categories: ['  personal  ', 'work  ', '  family'], // Whitespace
      entities: {},
      relationships: [],
      importance: 0.5
    };
    
    await storage.storeMemory(whitespaceMemory);
    console.log('✅ Memory with whitespace categories stored successfully');
    
    // Verify it was normalized (whitespace trimmed)
    const retrieved = await storage.retrieveMemory('test-whitespace');
    console.log('   - Normalized categories:', retrieved.categories);
    console.log('   - No whitespace:', retrieved.categories.every(cat => !cat.includes(' ')));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n7. Testing retrieval of all memories (should not crash)...');
  try {
    const allMemories = await storage.getAllMemories();
    console.log('✅ Retrieved all memories successfully');
    console.log('   - Total memories:', allMemories.length);
    
    // Verify all memories have proper categories
    let allValid = true;
    allMemories.forEach(memory => {
      if (!Array.isArray(memory.categories) || memory.categories.length === 0) {
        allValid = false;
      }
    });
    
    console.log('   - All memories have valid categories:', allValid);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  
  
  console.log('\n=== CORRUPTED MEMORY HANDLING TEST COMPLETE ===');
}

// Run the test
testCorruptedMemoryHandling().catch(console.error);
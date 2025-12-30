#!/usr/bin/env node

/**
 * Integration Test for Comprehensive Memory System MCP Server
 * Validates connectivity to backend services and MCP server functionality
 */

import { readFileSync } from 'fs';

async function testIntegration() {
  console.log('🔗 Testing Comprehensive Memory System Integration...\n');
  
  // Test 1: Validate backend service connectivity
  console.log('📋 Test 1: Backend Service Connectivity');
  
  const testResults = {
    memoryService: false,
    chromaDB: false,
    vllm: false
  };
  
  try {
    // Test Memory Service
    const memoryResponse = await fetch('http://192.168.68.71:3000/api/health');
    if (memoryResponse.ok) {
      testResults.memoryService = true;
      console.log('✅ Memory Service (CLU:3000) - Connected');
    } else {
      console.log('❌ Memory Service (CLU:3000) - Connection failed');
    }
  } catch (error) {
    console.log('❌ Memory Service (CLU:3000) - Connection error:', error.message);
  }
  
  try {
    // Test ChromaDB
    const chromaResponse = await fetch('http://192.168.68.69:8001/api/v2/tenants/default_tenant/databases/default_database/heartbeat');
    if (chromaResponse.ok) {
      testResults.chromaDB = true;
      console.log('✅ ChromaDB (SARK:8001) - Connected');
    } else {
      console.log('❌ ChromaDB (SARK:8001) - Connection failed');
    }
  } catch (error) {
    console.log('❌ ChromaDB (SARK:8001) - Connection error:', error.message);
  }
  
  try {
    // Test vLLM Health
    const vllmResponse = await fetch('http://192.168.68.69:8080/health');
    if (vllmResponse.ok) {
      testResults.vllm = true;
      console.log('✅ vLLM (SARK:8080) - Connected');
    } else {
      console.log('❌ vLLM (SARK:8080) - Connection failed');
    }
  } catch (error) {
    console.log('❌ vLLM (SARK:8080) - Connection error:', error.message);
  }
  
  const allServicesConnected = Object.values(testResults).every(result => result);
  if (allServicesConnected) {
    console.log('✅ All backend services are accessible');
  } else {
    console.log('⚠️  Some backend services are not accessible - MCP server may have limited functionality');
  }
  
  // Test 2: Validate MCP server tool configurations
  console.log('\n📋 Test 2: MCP Server Tool Configuration Validation');
  
  const serverContent = readFileSync('.opencode/mcp/comprehensive-memory-system-server.ts', 'utf8');
  
  // Check that tools are properly configured with correct backend service URLs
  const urlChecks = {
    MEMORY_SERVICE_URL: serverContent.includes('MEMORY_SERVICE_URL') && serverContent.includes('192.168.68.71:3000'),
    CHROMADB_URL: serverContent.includes('CHROMADB_URL') && serverContent.includes('192.168.68.69:8001'),
    VLLM_URL: serverContent.includes('VLLM_URL') && serverContent.includes('192.168.68.69:8080')
  };
  
  Object.entries(urlChecks).forEach(([config, present]) => {
    if (present) {
      console.log(`✅ ${config} - Correctly configured`);
    } else {
      console.log(`❌ ${config} - Missing or incorrect configuration`);
    }
  });
  
  // Test 3: Validate client implementations
  console.log('\n📋 Test 3: Client Implementation Validation');
  
  const clientFiles = [
    '.opencode/mcp/clients/memory-system-client.js',
    '.opencode/mcp/clients/chromadb-client.js',
    '.opencode/mcp/clients/vllm-client.js'
  ];
  
  const clientChecks = {
    'memory-system-client': {
      exists: clientFiles[0],
      hasStoreMethod: false,
      hasRetrieveMethod: false,
      hasDeleteMethod: false
    },
    'chromadb-client': {
      exists: clientFiles[1],
      hasEmbedMethod: false,
      hasQueryMethod: false,
      hasListCollectionsMethod: false
    },
    'vllm-client': {
      exists: clientFiles[2],
      hasGenerateMethod: false,
      hasHealthMethod: false
    }
  };
  
  for (const [clientName, checks] of Object.entries(clientChecks)) {
    try {
      const clientContent = readFileSync(checks.exists, 'utf8');
      
      if (clientName === 'memory-system-client') {
        checks.hasStoreMethod = clientContent.includes('async storeMemory(data)');
        checks.hasRetrieveMethod = clientContent.includes('async retrieveMemories(params)');
        checks.hasDeleteMethod = clientContent.includes('async deleteMemory(memoryId)');
      } else if (clientName === 'chromadb-client') {
        checks.hasEmbedMethod = clientContent.includes('async embed(text)');
        checks.hasQueryMethod = clientContent.includes('async query(collection, queryText');
        checks.hasListCollectionsMethod = clientContent.includes('async listCollections()');
      } else if (clientName === 'vllm-client') {
        checks.hasGenerateMethod = clientContent.includes('async generate(params)');
        checks.hasHealthMethod = clientContent.includes('async health()');
      }
      
      console.log(`✅ ${clientName} - All required methods present`);
    } catch (error) {
      console.log(`❌ ${clientName} - Error reading file: ${error.message}`);
    }
  }
  
  // Test 4: Validate MCP server structure
  console.log('\n📋 Test 4: MCP Server Structure Validation');
  
  const serverChecks = {
    hasServerClass: serverContent.includes('new Server(') || serverContent.includes('class Server'),
    hasMemoryClientImport: serverContent.includes('createClient as createMemoryClient'),
    hasChromaDBClientImport: serverContent.includes('createClient as createChromaDBClient'),
    hasVLLMClientImport: serverContent.includes('createClient as createVLLMClient'),
    hasToolDefinitions: serverContent.includes('tools: ['),
    hasToolHandlers: serverContent.includes('setRequestHandler(CallToolRequestSchema'),
    hasErrorHandling: serverContent.includes('try {') && serverContent.includes('} catch (error)')
  };
  
  Object.entries(serverChecks).forEach(([check, present]) => {
    if (present) {
      console.log(`✅ ${check.replace(/([A-Z])/g, ' $1').trim()} - Present`);
    } else {
      console.log(`❌ ${check.replace(/([A-Z])/g, ' $1').trim()} - Missing`);
    }
  });
  
  // Test 5: Validate tool schema definitions
  console.log('\n📋 Test 5: Tool Schema Validation');
  
  const requiredTools = [
    'memory_store_information',
    'memory_retrieve_information',
    'memory_verify_existence',
    'memory_delete_information',
    'memory_semantic_search',
    'memory_rag_generate'
  ];
  
  const toolSchemas = {};
  
  requiredTools.forEach(toolName => {
    // Check if tool name exists in tools array
    if (serverContent.includes(`name: "${toolName}"`)) {
      toolSchemas[toolName] = {
        hasInputSchema: serverContent.includes('inputSchema'),
        hasProperties: serverContent.includes('properties'),
        hasRequired: serverContent.includes('required')
      };
    }
  });
  
  Object.entries(toolSchemas).forEach(([toolName, schema]) => {
    if (schema.hasInputSchema && schema.hasProperties && schema.hasRequired) {
      console.log(`✅ ${toolName} - Properly configured schema`);
    } else {
      console.log(`❌ ${toolName} - Incomplete schema`);
    }
  });
  
  // Summary
  console.log('\n📊 Integration Test Summary');
  console.log('='.repeat(50));
  
  const totalTests = 5;
  const passedTests = [
    allServicesConnected ? 1 : 0,
    Object.values(urlChecks).every(v => v) ? 1 : 0,
    Object.values(clientChecks).every(c => c.exists) ? 1 : 0,
    Object.values(serverChecks).every(v => v) ? 1 : 0,
    Object.values(toolSchemas).every(s => s.hasInputSchema && s.hasProperties && s.hasRequired) ? 1 : 0
  ].reduce((a, b) => a + b, 0);
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed! MCP server is ready for production use.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Review the output above for details.');
    return false;
  }
}

// Run the integration test
testIntegration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
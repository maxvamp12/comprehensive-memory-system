#!/usr/bin/env node

/**
 * Test script for Comprehensive Memory System MCP Server
 * Validates MCP server functionality and tool availability
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import { readFileSync } from 'fs';

async function testMcpServer() {
  console.log('🧪 Testing Comprehensive Memory System MCP Server...\n');
  
  // Test 1: Check if MCP server starts correctly
  console.log('📋 Test 1: MCP Server Startup');
  try {
    const serverProcess = spawn('bun', ['run', 'comprehensive-memory-system-server.ts'], {
      cwd: '.opencode/mcp',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for server to start
    await setTimeout(3000);
    
    if (stderr.includes('Server ready to accept requests')) {
      console.log('✅ MCP Server started successfully');
    } else {
      console.log('❌ MCP Server startup failed');
      console.log('Error output:', stderr);
      return false;
    }
    
    serverProcess.kill();
    await setTimeout(1000);
    
  } catch (error) {
    console.log('❌ MCP Server test failed:', error.message);
    return false;
  }
  
  // Test 2: Check if all required tools are defined
  console.log('\n📋 Test 2: Tool Definitions');
  const requiredTools = [
    'memory_store_information',
    'memory_retrieve_information', 
    'memory_verify_existence',
    'memory_delete_information',
    'memory_semantic_search',
    'memory_rag_generate',
    'memory_list_domains',
    'memory_get_statistics',
    'memory_remember_information',
    'memory_recall_information'
  ];
  
  let serverContent;
  try {
    serverContent = readFileSync('.opencode/mcp/comprehensive-memory-system-server.ts', 'utf8');
    console.log('✅ Server file read successfully');
  } catch (error) {
    console.log('❌ Could not read server file:', error.message);
    return false;
  }
  
  const missingTools = requiredTools.filter(tool => !serverContent.includes(`name: "${tool}"`));
  
  if (missingTools.length === 0) {
    console.log('✅ All required tools are defined');
  } else {
    console.log('❌ Missing tools:', missingTools.join(', '));
    return false;
  }
  
  // Test 3: Check if client imports are working
  console.log('\n📋 Test 3: Client Imports');
  const clientFiles = [
    '.opencode/mcp/clients/memory-system-client.js',
    '.opencode/mcp/clients/chromadb-client.js',
    '.opencode/mcp/clients/vllm-client.js'
  ];
  
  for (const clientFile of clientFiles) {
    try {
      readFileSync(clientFile, 'utf8');
      console.log(`✅ Client file exists: ${clientFile}`);
    } catch (error) {
      console.log(`❌ Client file missing: ${clientFile}`);
      return false;
    }
  }
  
  // Test 4: Check server configuration
  console.log('\n📋 Test 4: Server Configuration');
  const expectedConfigs = [
    'MEMORY_SERVICE_URL',
    'CHROMADB_URL', 
    'VLLM_URL'
  ];
  
  const missingConfigs = expectedConfigs.filter(config => !serverContent.includes(`const ${config} =`));
  
  if (missingConfigs.length === 0) {
    console.log('✅ All required configurations are defined');
  } else {
    console.log('❌ Missing configurations:', missingConfigs.join(', '));
    return false;
  }
  
  console.log('\n🎉 All MCP Server tests passed successfully!');
  return true;
}

// Run the test
testMcpServer()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
#!/usr/bin/env node

/**
 * Simple test to verify MCP server is running
 */

const net = require('net');
const config = require('./config.json');

async function simpleTest() {
  console.log('🔌 Testing MCP Server (simple)...');
  
  // Import and start the MCP server
  const { MCPServer } = require('./server/mcp-server');
  const mcpServer = new MCPServer(config);
  
  try {
    // Start the MCP server
    await mcpServer.start();
    console.log('✅ MCP Server started successfully');
    
    // Test basic connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const client = net.createConnection(config.opencode.mcpPort, () => {
          console.log('✅ MCP Client connected successfully');
          client.end();
          resolve();
        });
        
        client.on('error', (error) => {
          reject(error);
        });
        
        // Close after 1 second
        setTimeout(() => {
          client.end();
        }, 1000);
      }, 500); // Give server time to start
    });
    
  } catch (error) {
    console.error('❌ MCP Server test failed:', error);
    throw error;
}
}

if (require.main === module) {
  simpleTest()
    .then(() => {
      console.log('🎉 Simple MCP Server test passed!');
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { simpleTest };
#!/usr/bin/env node

/**
 * Test script for MCP Server functionality
 */

const net = require('net');
const { MCPServer } = require('./server/mcp-server');
const config = require('./config.json');

async function testMCPServer() {
  console.log('🔌 Testing MCP Server...');
  
  const mcpServer = new MCPServer(config);
  
  try {
    // Start the MCP server
    await mcpServer.start();
    console.log('✅ MCP Server started successfully');
    
    // Test MCP client connection
    const testClient = new MCPTestClient();
    await testClient.connect(config.opencode.mcpPort);
    
    console.log('✅ MCP Client connected successfully');
    
    // Test server info request
    const serverInfo = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });
    
    console.log('✅ Server info:', serverInfo.result.serverInfo);
    
    // Test tools list
    const toolsList = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    
    console.log('✅ Available tools:', toolsList.result.tools.map(t => t.name));
    
    // Test memory search tool
    const searchResult = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memories',
        arguments: {
          query: 'test',
          limit: 5,
          useSemanticSearch: true
        }
      }
    });
    
    console.log('✅ Search result:', {
      memories: searchResult.result.memories?.length || 0,
      message: searchResult.result.message || 'No memories found'
    });
    
    // Test add memory tool
    const addResult = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'add_memory',
        arguments: {
          content: 'Test memory for MCP integration',
          isDeclarative: true,
          importanceScore: 0.8,
          categories: ['test', 'mcp']
        }
      }
    });
    
    console.log('✅ Add memory result:', addResult.result);
    
    // Test memory stats resource
    const statsResult = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/read',
      params: {
        uri: 'mem:///stats'
      }
    });
    
    console.log('✅ Memory stats:', statsResult.result.contents[0].text);
    
    // Test system info resource
    const infoResult = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'resources/read',
      params: {
        uri: 'mem:///info'
      }
    });
    
    console.log('✅ System info:', JSON.parse(infoResult.result.contents[0].text).name);
    
    // Test list memories tool
    const listResult = await testClient.sendRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'list_memories',
        arguments: {
          limit: 10
        }
      }
    });
    
    console.log('✅ List memories result:', {
      total: listResult.result.memories?.length || 0,
      message: listResult.result.message || 'No memories found'
    });
    
    // Close test client
    await testClient.disconnect();
    
    console.log('🎉 All MCP Server tests passed!');
    
  } catch (error) {
    console.error('❌ MCP Server test failed:', error);
    process.exit(1);
  } finally {
    // Stop the MCP server
    await mcpServer.stop();
    console.log('🔌 MCP Server stopped');
  }
}

class MCPTestClient {
  constructor() {
    this.socket = null;
    this.messageId = 1;
    this.responses = new Map();
  }

  connect(port) {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(port, () => {
        console.log('🔗 Connected to MCP server');
        resolve();
      });

      this.socket.on('data', (data) => {
        const messages = data.toString().split('\n').filter(msg => msg.trim());
        
        for (const message of messages) {
          try {
            const response = JSON.parse(message);
            if (response.id) {
              const handler = this.responses.get(response.id);
              if (handler) {
                this.responses.delete(response.id);
                handler(response);
              }
            }
          } catch (error) {
            console.error('Failed to parse MCP message:', error);
          }
        }
      });

      this.socket.on('error', (error) => {
        reject(error);
      });
    });
  }

  sendRequest(request) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      request.id = id;
      
      // Store resolve function for this id
      const timeout = setTimeout(() => {
        this.responses.delete(id);
        reject(new Error('MCP request timeout'));
      }, 5000);
      
      const responseHandler = (response) => {
        clearTimeout(timeout);
        this.responses.delete(id);
        resolve(response);
      };
      
      this.responses.set(id, responseHandler);
      
      // Send request
      const message = JSON.stringify(request) + '\n';
      this.socket.write(message);
      
      // Wait for response
      const checkResponse = () => {
        const response = this.responses.get(id);
        if (response) {
          this.responses.delete(id);
          resolve(response);
        } else {
          setTimeout(checkResponse, 10);
        }
      };
      
      checkResponse();
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.end(() => {
          console.log('🔌 Disconnected from MCP server');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Run the test
if (require.main === module) {
  testMCPServer().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMCPServer, MCPTestClient };
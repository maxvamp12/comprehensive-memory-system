const MemoryServer = require('./server/memory-server');
const MCPServer = require('./server/mcp-server');
const winston = require('winston');

console.log('MemoryServer:', typeof MemoryServer);
console.log('MCPServer:', typeof MCPServer.MCPServer);

// Test instantiation
try {
    const testMcp = new MCPServer.MCPServer({ port: 8080 });
    console.log('MCPServer instantiation successful');
} catch (error) {
    console.log('MCPServer instantiation failed:', error.message);
}
#!/usr/bin/env node

const MemoryServer = require('./server/memory-server');
const MCPServer = require('./server/mcp-server');
const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/server.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

async function startServer() {
    try {
        // Load configuration
        const config = require('./config.json');
        
        // Create and start the memory server
        const httpServer = new MemoryServer(config);
        const mcpServer = new MCPServer(config);
        
        logger.info('🚀 Starting servers...');
        
        // Start HTTP server
        await httpServer.start();
        logger.info('🌐 HTTP Server started successfully!');
        
        // Start MCP server
        await mcpServer.start();
        logger.info('🔌 MCP Server started successfully!');
        
        logger.info(`🌐 Health Check: http://localhost:${config.server.port}/health`);
        logger.info(`📊 System Info: http://localhost:${config.server.port}/api/info`);
        logger.info(`🔍 Search API: http://localhost:${config.server.port}/api/search`);
        logger.info(`🤖 OpenAI Compatible: http://localhost:${config.server.port}/api/v1/chat/completions`);
        logger.info(`🔌 MCP Server: tcp://localhost:${config.mcpPort}`);
        
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            await Promise.all([
                httpServer.stop(),
                mcpServer.stop()
            ]);
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            await Promise.all([
                httpServer.stop(),
                mcpServer.stop()
            ]);
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ Failed to start servers', { error: error.message });
        process.exit(1);
    }
}

// Start the server
startServer();
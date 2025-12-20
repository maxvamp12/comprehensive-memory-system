const MemoryServer = require("./server/memory-server");
const logger = require("winston");

// Initialize memory server
const server = new MemoryServer({
    port: 3000,
    host: "0.0.0.0",
    logLevel: "info"
});

// Start the server
async function startServer() {
    try {
        await server.start();
        logger.info("Memory server started successfully");
    } catch (error) {
        logger.error("Failed to start memory server", { error: error.message });
        process.exit(1);
    }
}

startServer();
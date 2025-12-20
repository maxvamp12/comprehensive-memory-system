const MemoryServer = require('./server/memory-server');

async function testMemoryServer() {
    try {
        const server = new MemoryServer({
            port: 3000,
            host: '0.0.0.0',
            dataDir: './data'
        });
        
        await server.start();
        console.log('Memory server started successfully!');
        
        // Test health endpoint
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Health check:', JSON.parse(data));
            });
        });
        
        req.on('error', (err) => {
            console.error('Error making request:', err.message);
        });
        
        req.end();
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMemoryServer();
# Memory Server Quickstart Guide for Opencode Integration

## 🚀 Overview

This guide helps you set up and integrate the Comprehensive Memory System with opencode for network-enabled RAG functionality.

## 📋 Prerequisites

- Node.js 16+ installed
- npm installed
- SARK server access (192.168.68.69)
- ChromaDB server running on SARK (port 8001)
- ChromaDB authentication credentials (admin:admin)

## 🔧 ChromaDB Connection Details

The system is pre-configured to connect to the ChromaDB instance running on SARK:

**Connection Information:**
- **Host**: `192.168.68.69`
- **Port**: `8001`
- **Collection**: `memories`
- **Authentication**: `admin:admin`

**Testing Connection:**
```bash
# Test ChromaDB heartbeat
curl -u admin:admin http://192.168.68.69:8001/api/v1/heartbeat

# List ChromaDB collections
curl -u admin:admin http://192.168.68.69:8001/api/v1/collections
```

## 🔧 Installation

### Automatic Setup (Recommended)

Run the setup script:

```bash
chmod +x setup-opencode.sh
./setup-opencode.sh
```

This will:
- Install all dependencies
- Create configuration files
- Set up opencode integration
- Create utility scripts

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node start.js
   ```

3. **Configure opencode:**
   - The server automatically creates `~/.opencode/config.json`
   - No manual configuration needed

## 🌐 Server Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Memory Management
- **Create Memory:** `POST /api/memories`
- **Get Memory:** `GET /api/memories/:id`
- **List Memories:** `GET /api/memories`
- **Related Memories:** `GET /api/memories/:id/related`

### Search APIs
- **Semantic Search:** `POST /api/search`
- **OpenAI Compatible:** `POST /api/v1/chat/completions`

### System Information
```bash
curl http://localhost:3000/api/info
```

### MCP Server
The server also includes an MCP (Model Context Protocol) server for enhanced integration:

- **MCP Port**: `8080`
- **MCP Endpoint**: `tcp://localhost:8080`
- **MCP Tools**: `search_memories`, `add_memory`, `get_memory`, `list_memories`
- **MCP Resources**: `memory_stats`, `system_info`

## 🤖 Opencode Integration

### Configuration
The server automatically configures opencode to use the memory system. The configuration includes:

```json
{
  "memory_server": {
    "enabled": true,
    "host": "192.168.68.69",
    "port": 3000,
    "endpoints": {
      "openai": "http://192.168.68.69:3000/api/v1/chat/completions",
      "search": "http://192.168.68.69:3000/api/search",
      "memories": "http://192.168.68.69:3000/api/memories"
    },
    "chroma": {
      "host": "192.168.68.69",
      "port": 8001,
      "auth": {
        "username": "admin",
        "password": "admin"
      }
    }
  }
}
```

### Usage Examples

#### 1. Add Memories via API
```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I went to San Francisco last summer",
    "timestamp": "2025-12-09T00:00:00.000Z",
    "isDeclarative": true,
    "importanceScore": 0.8,
    "confidence": 0.9,
    "entities": {
      "places": ["San Francisco"]
    },
    "categories": ["travel", "personal"]
  }'
```

#### 2. Search via OpenAI Compatible API
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "memory-search",
    "messages": [
      {
        "role": "user",
        "content": "Tell me about my travel experiences"
      }
    ]
  }'
```

#### 3. Direct Semantic Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "travel to California",
    "limit": 5,
    "useSemanticSearch": true
  }'
```

## 📡 Network Configuration

### Server Access
The server runs on `192.168.68.69:3000` by default. Ensure the firewall allows:
- Port 3000 (HTTP server)
- Port 8080 (MCP server, if enabled)

### Client Connection
From any client on the network, access:
- **Health Check:** `http://192.168.68.69:3000/health`
- **OpenAI API:** `http://192.168.68.69:3000/api/v1/chat/completions`

### ChromaDB Connection Testing
If you need to manually test ChromaDB connectivity:
```bash
# Test ChromaDB heartbeat
curl -u admin:admin http://192.168.68.69:8001/api/v1/heartbeat

# List ChromaDB collections
curl -u admin:admin http://192.168.68.69:8001/api/v1/collections

# Test ChromaDB connection from server
curl -s http://192.168.68.69:8001/api/v1/heartbeat | grep -q "heartbeat" && echo "ChromaDB OK" || echo "ChromaDB Failed"
```

## 🔧 Management Commands

### Start Server
```bash
./start.js
```

### Stop Server
```bash
./stop.sh
```

### Restart Server
```bash
./restart.sh
```

### View Logs
```bash
tail -f logs/server.log
```

## 🐛 Troubleshooting

### Server Won't Start
1. Check if port 3000 is available: `netstat -an | grep 3000`
2. Check Node.js version: `node --version`
3. Check logs: `logs/server.log`

### Opencode Connection Issues
1. Verify server is running: `curl http://localhost:3000/health`
2. Check network connectivity: `ping 192.168.68.69`
3. Verify opencode configuration: `cat ~/.opencode/config.json`

### ChromaDB Connection Issues
1. Verify ChromaDB server is running: 
   ```bash
   curl -u admin:admin http://192.168.68.69:8001/api/v1/heartbeat
   ```
2. Check network connectivity to ChromaDB
3. Verify configuration in `config.json`
4. Ensure authentication credentials are correct
5. Check ChromaDB port is accessible: `netstat -an | grep 8001`
6. Verify ChromaDB Docker container is running on SARK

### MCP Server Issues
1. Check MCP server is running: `nc -z localhost 8080`
2. Verify MCP port is not blocked by firewall
3. Check MCP server logs: `logs/mcp-server.log`
4. Test MCP client connection manually

## 📊 Performance Monitoring

### Server Metrics
- **Health Check:** `/health`
- **System Info:** `/api/info`
- **Memory Count:** `/api/memories` (count field)

### Logging
- Server logs: `logs/server.log`
- Memory operations: `logs/memory-server.log`
- Search operations: `logs/retrieval-engine.log`
- ChromaDB operations: `logs/chromadb.log`
- MCP server: `logs/mcp-server.log`

### MCP Server Testing
To test the MCP server connection:
```bash
# Test MCP server availability
nc -z localhost 8080 && echo "MCP Server OK" || echo "MCP Server Failed"

# Test MCP client connection (using netcat)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | nc localhost 8080
```

## 🚀 Advanced Configuration

### Custom Configuration
Edit `config.json` to modify:
- Server settings (host, port)
- Memory storage settings
- ChromaDB connection
- Search parameters

### Environment Variables
```bash
export MEMORY_SERVER_PORT=3000
export MEMORY_SERVER_HOST=0.0.0.0
export CHROMA_DB_HOST=192.168.68.69
export CHROMA_DB_PORT=8001
export CHROMA_DB_USERNAME=admin
export CHROMA_DB_PASSWORD=admin
export MCP_SERVER_PORT=8080
```

## 📚 API Documentation

### Memory Object Structure
```json
{
  "id": "unique_identifier",
  "content": "Memory content string",
  "timestamp": "ISO_8601_date",
  "isDeclarative": boolean,
  "importanceScore": number,
  "confidence": number,
  "entities": {
    "people": [],
    "places": [],
    "organizations": [],
    "dates": [],
    "money": [],
    "numbers": []
  },
  "categories": ["personal", "work", "reminder"],
  "storedAt": "ISO_date",
  "lastAccessed": "ISO_date"
}
```

### API Usage Examples

#### Add Memory with ChromaDB Integration
```bash
curl -X POST http://192.168.68.69:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I visited San Francisco last summer",
    "timestamp": "2025-12-09T00:00:00.000Z",
    "isDeclarative": true,
    "importanceScore": 0.8,
    "confidence": 0.9,
    "categories": ["travel", "personal"],
    "entities": {
      "places": ["San Francisco"]
    }
  }'
```

#### Semantic Search with ChromaDB
```bash
curl -X POST http://192.168.68.69:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "travel to California",
    "limit": 5,
    "useSemanticSearch": true,
    "minSimilarity": 0.1
  }'
```

#### MCP Server Memory Access
```bash
# Add memory via MCP
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "add_memory",
    "arguments": {
      "content": "MCP test memory",
      "categories": ["test"]
    }
  }
}' | nc localhost 8080
```

### Search Parameters
```json
{
  "query": "search string",
  "limit": 10,
  "minSimilarity": 0.1,
  "category": "optional_category_filter",
  "useSemanticSearch": true
}
```

## 🎯 Next Steps

1. **Test the Server:** Run the setup script and verify endpoints
2. **Add Memories:** Use the API or integrate with your application
3. **Configure Opencode:** The server automatically handles opencode setup
4. **Monitor Performance:** Use the provided logging and monitoring tools
5. **Scale Up:** Add more clients and test network performance

## 🚀 Deployment & Scaling

### Production Deployment
```bash
# Start servers in production mode
npm run start

# Or use systemd service
sudo systemctl start memory-server
sudo systemctl start mcp-server

# Check service status
sudo systemctl status memory-server
sudo systemctl status mcp-server
```

### Multi-Client Configuration
The system supports multiple concurrent clients:
- **HTTP Server**: Handles API requests on port 3000
- **MCP Server**: Handles MCP protocol on port 8080
- **ChromaDB**: Centralized vector storage on port 8001

### Load Testing
```bash
# Test HTTP server load
ab -n 1000 -c 10 -p test-body.json -T application/json http://192.168.68.69:3000/api/memories

# Test MCP server load
for i in {1..100}; do echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | nc localhost 8080; done
```

### Backup & Recovery
```bash
# Create backup
node -e "
const { StorageManager } = require('./core/storage-manager');
const storage = new StorageManager();
storage.createBackup().then(console.log);
"

# Restore from backup (manual process)
# 1. Stop servers
# 2. Restore data files from backup
# 3. Restart servers
```

## 📞 Support

For issues and questions:
- Check logs: `logs/server.log`
- Verify network connectivity
- Review configuration in `config.json`
- Test endpoints with curl commands

---

**Note:** This memory server is designed to work with opencode and provides OpenAI-compatible API endpoints for seamless integration.
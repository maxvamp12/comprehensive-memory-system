# Memory System API Documentation
# For use with Cursor, Opencode, and other AI tools

## Overview
The Comprehensive Memory System provides a RESTful API with OpenAI-compatible endpoints for enhancing AI encoding experiences.

## Base URL
```
http://192.168.68.71:3000
```

## Authentication
Currently, no authentication is required for development. For production, implement API key authentication.

## API Endpoints

### Health Check
**GET** `/health`
Check if the system is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "memory-server",
  "version": "1.0.0"
}
```

### System Information
**GET** `/api/info`
Get system information and available endpoints.

**Response:**
```json
{
  "success": true,
  "service": "Memory Server",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "memories": {
      "create": "POST /api/memories",
      "get": "GET /api/memories/:id",
      "list": "GET /api/memories",
      "related": "GET /api/memories/:id/related"
    },
    "search": {
      "openai": "POST /api/v1/chat/completions",
      "semantic": "POST /api/search"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Memory Management

#### Create Memory
**POST** `/api/memories`
Create a new memory entry.

**Request Body:**
```json
{
  "content": "Your memory content here",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "categories": ["personal", "work"],
  "importanceScore": 0.8,
  "isDeclarative": true,
  "confidence": 0.9,
  "entities": {
    "people": [],
    "places": [],
    "organizations": [],
    "dates": [],
    "money": [],
    "numbers": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Memory stored successfully",
  "memoryId": "1704105600000_abc123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Memory
**GET** `/api/memories/:id`
Retrieve a specific memory by ID.

#### List All Memories
**GET** `/api/memories`
List all memories with optional filtering.

**Query Parameters:**
- `category`: Filter by category
- `limit`: Number of results (default: 10)
- `minImportance`: Minimum importance score

#### Get Related Memories
**GET** `/api/memories/:id/related`
Find memories related to a specific memory.

### Search Functionality

#### Semantic Search (OpenAI Compatible)
**POST** `/api/v1/chat/completions`
OpenAI-compatible endpoint for semantic memory search.

**Request Body (OpenAI format):**
```json
{
  "model": "memory-search",
  "messages": [
    {
      "role": "user",
      "content": "Search memories about my recent project"
    }
  ],
  "temperature": 0.1,
  "max_tokens": 1000
}
```

**Response (OpenAI format):**
```json
{
  "id": "chatcmpl-1704105600000",
  "object": "chat.completion",
  "created": 1704105600,
  "model": "memory-search",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I found 3 memories related to your recent project:\n\n1. Project kickoff meeting with team members\n2. Project deadline and milestones\n3. Project budget allocation"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 87,
    "total_tokens": 99
  }
}
```

#### Direct Search
**POST** `/api/search`
Direct search with advanced filtering options.

**Request Body:**
```json
{
  "query": "Search query",
  "limit": 10,
  "minSimilarity": 0.1,
  "category": "optional category filter",
  "useSemanticSearch": true
}
```

**Response:**
```json
{
  "success": true,
  "query": "Search query",
  "results": [
    {
      "id": "1704105600000_abc123",
      "content": "Memory content",
      "categories": ["personal"],
      "importanceScore": 0.8,
      "similarity": 0.95,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Client Integration Examples

### Cursor Integration
Add to your Cursor settings:
```json
{
  "memory_search_endpoint": "http://192.168.68.71:3000/api/v1/chat/completions",
  "memory_model": "memory-search"
}
```

### Opencode Configuration
```json
{
  "memory_server": {
    "enabled": true,
    "host": "192.168.68.71",
    "port": 3000,
    "endpoints": {
      "openai": "http://192.168.68.71:3000/api/v1/chat/completions",
      "search": "http://192.168.68.71:3000/api/search",
      "memories": "http://192.168.68.71:3000/api/memories",
      "health": "http://192.168.68.71:3000/health"
    },
    "models": {
      "memory-search": {
        "provider": "memory",
        "endpoint": "http://192.168.68.71:3000/api/v1/chat/completions",
        "model": "memory-search"
      }
    }
  }
}
```

### cURL Examples
```bash
# Health check
curl http://192.168.68.71:3000/health

# Create memory
curl -X POST http://192.168.68.71:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "Important meeting tomorrow", "categories": ["work"]}'

# Semantic search
curl -X POST http://192.168.68.71:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "memory-search",
    "messages": [{"role": "user", "content": "Find work-related memories"}],
    "temperature": 0.1
  }'
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid request format
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting
Currently no rate limiting is implemented. For production, consider adding rate limiting headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## SSL/TLS
The service runs on HTTP by default. For production, configure SSL/TLS certificates and update the nginx configuration to enable HTTPS.

## Monitoring
- Health check: `/health`
- System metrics available via `/api/info`
- Logs available through Docker: `docker-compose logs -f`
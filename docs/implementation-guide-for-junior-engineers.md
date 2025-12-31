# Comprehensive Memory System Implementation Guide for Junior Engineers

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Step-by-Step Deployment Process](#step-by-step-deployment-process)
4. [Basic Implementation Examples](#basic-implementation-examples)
5. [Testing Procedures](#testing-procedures)
6. [Common Troubleshooting Scenarios](#common-troubleshooting-scenarios)
7. [Maintenance Guidelines](#maintenance-guidelines)
8. [Expansion Possibilities](#expansion-possibilities)

## System Overview

### What is the Comprehensive Memory System?

The Comprehensive Memory System is a sophisticated, multi-domain memory management platform designed to store, retrieve, and organize information across different domains. Think of it as a "smart memory" that can understand, categorize, and retrieve information based on context, content type, and user needs.

### Core Conceptual Understanding

At its heart, this system addresses a fundamental challenge: **how to organize and retrieve information efficiently across different domains**. Imagine you have conversations about:

- **BMAD Code**: Technical discussions about software architecture
- **Website Information**: Content from various websites
- **Religious Discussions**: Theological conversations
- **Electronics/Maker Projects**: Technical discussions about hardware

Each domain has its own vocabulary, context, and requirements. The system provides a unified way to store and retrieve information while respecting these domain-specific characteristics.

### Real-World Use Cases

This system solves several real-world problems:

1. **Knowledge Management**: Teams can store and retrieve technical discussions, decisions, and solutions
2. **Content Organization**: Website content can be categorized and searched intelligently
3. **Theological Research**: Religious discussions can be preserved and analyzed
4. **Project Documentation**: Electronics projects can be documented with specifications and progress

## Architecture Components

### 1. Memory Service (Node.js/Express)

**What it does**: The Memory Service is the main API gateway that handles all incoming requests and orchestrates the system.

**Key responsibilities**:
- User authentication and authorization
- Request validation and processing
- Communication with other system components
- API endpoint management

**How it works**: You send requests to the Memory Service, which validates them, processes the data, and stores or retrieves memories through the appropriate channels.

### 2. Load Balancer (Python)

**What it does**: The Load Balancer acts as a traffic controller that distributes requests efficiently across the system.

**Key responsibilities**:
- Distributing incoming requests
- Health monitoring of services
- Caching frequently accessed data
- Managing service availability

**How it works**: When requests come in, the Load Balancer decides which service should handle them based on current load, service health, and caching strategies.

### 3. ChromaDB (Vector Database)

**What it does**: ChromaDB is a specialized database designed for storing and retrieving information based on semantic similarity.

**Key responsibilities**:
- Storing memory embeddings (numerical representations of content)
- Performing similarity searches
- Managing memory metadata
- Providing fast retrieval based on content meaning

**How it works**: The system converts text into numerical vectors (embeddings) and stores them in ChromaDB. When you search for something, it finds the most similar vectors based on mathematical similarity.

### 4. Multi-Domain Memory System (Python)

**What it does**: This is the core intelligence layer that understands and manages different domains of information.

**Key responsibilities**:
- Domain-specific validation
- Memory categorization
- Contextual understanding
- Advanced search capabilities

**How it works**: Each domain has its own set of rules and validation logic. The system ensures that information is stored correctly and can be retrieved efficiently within each domain.

### 5. Caching System (Python)

**What it does**: The Caching System improves performance by storing frequently accessed data in memory.

**Key responsibilities**:
- Storing frequently accessed data
- Reducing database load
- Improving response times
- Managing cache expiration

**How it works**: When you request data, the system first checks if it's in the cache. If it is, it returns the cached data immediately. If not, it fetches from the database and stores a copy in the cache for future requests.

### 6. Docker Containers

**What it does**: Docker containers package each component with its dependencies, ensuring consistent deployment across different environments.

**Key responsibilities**:
- Environment consistency
- Dependency management
- Service isolation
- Scalability

**How it works**: Each component runs in its own container, making the system modular and easier to manage.

## Step-by-Step Deployment Process

### Prerequisites

Before you begin, ensure you have:

1. **Docker and Docker Compose**: Install Docker and Docker Compose on your system
2. **Node.js**: Node.js 18+ for the Memory Service
3. **Python**: Python 3.8+ for backend components
4. **Git**: For cloning the repository
5. **Code Editor**: VS Code or similar for development

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd comprehensive-memory-system

# Install dependencies for each component
cd memory-service
npm install
cd ../src/load-balancer
pip install -r requirements.txt
cd ../src/caching
pip install -r requirements.txt
cd ../src/memory
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Memory Service Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-secret-key-here

# Database Configuration
CHROMADB_HOST=localhost
CHROMADB_PORT=8001
CHROMADB_PATH=/api/v2/tenants/default_tenant/databases/default_database

# Load Balancer Configuration
LOAD_BALANCER_PORT=8082
LOAD_BALANCER_HOST=0.0.0.0

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Step 3: Start the Services

```bash
# Start all services using Docker Compose
docker-compose up -d

# Or start individual services
docker-compose up -d chromadb memory-service load-balancer caching-service
```

### Step 4: Verify Deployment

Check that all services are running:

```bash
# Check container status
docker-compose ps

# Test health endpoints
curl http://localhost:8082/health
curl http://localhost:3000/health
```

### Step 5: Initial Data Setup

Create your first memory entry:

```bash
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "content": "This is my first memory entry",
    "type": "technical",
    "session_id": "session-123",
    "domain": "bmad_code"
  }'
```

## Basic Implementation Examples

### Example 1: Storing a Technical Memory

```javascript
// Example of storing a BMAD code memory
const memoryData = {
  domain: "bmad_code",
  content_data: {
    code_snippet: "function calculateSum(a, b) { return a + b; }",
    conversation_context: "Discussion about utility functions",
    project_id: "project-001",
    technical_specs: {
      language: "JavaScript",
      framework: "Node.js"
    }
  },
  source: "development_team",
  tags: ["javascript", "utility", "math"]
};

// This would be sent to the Memory Service API
fetch('/api/memory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify(memoryData)
});
```

**What this does**: Stores a piece of code with context, making it searchable and retrievable later.

### Example 2: Searching Memories

```javascript
// Example of searching for technical memories
const searchQuery = {
  domain: "bmad_code",
  keywords: ["javascript", "utility"],
  limit: 10
};

fetch('/api/memory/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify(searchQuery)
});
```

**What this does**: Searches for memories related to JavaScript utility functions, returning relevant results based on semantic similarity.

### Example 3: Website Information Storage

```python
# Example of storing website information
website_data = {
    "url": "https://example.com",
    "content_summary": "A comprehensive guide to web development",
    "content_categories": ["tutorial", "web-development"],
    "website_metadata": {
        "title": "Web Development Guide",
        "description": "Learn modern web development techniques"
    }
}

# This would be processed by the multi-domain memory system
memory_entry = {
    "domain": "website_info",
    "content_data": website_data,
    "source": "web_scraper",
    "confidence": 0.9
}
```

**What this does**: Stores website information with metadata, making it searchable and categorizable.

## Testing Procedures

### 1. Unit Testing

Each component should have unit tests to verify individual functionality:

```bash
# Run unit tests for the memory service
cd memory-service
npm test

# Run unit tests for Python components
cd src/load-balancer
python -m pytest tests/

cd src/caching
python -m pytest tests/

cd src/memory
python -m pytest tests/
```

### 2. Integration Testing

Test how components work together:

```bash
# Test memory service integration
python tests/unit/test-memory-service-container.py

# Test load balancer functionality
python tests/unit/test-load-balancer-routing.py

# Test caching system
python tests/unit/test-connection-pool.py
```

### 3. End-to-End Testing

Test the complete system workflow:

```bash
# Test complete memory lifecycle
python tests/unit/test-memory-service-container.py

# Test load balancing and caching together
python tests/unit/test-load-balancer.py
```

### 4. Performance Testing

Test system performance under load:

```bash
# Use tools like Apache Bench or JMeter
ab -n 1000 -c 10 http://localhost:8082/health

# Or use Python's performance testing
python tests/unit/test-performance.py
```

## Common Troubleshooting Scenarios

### Scenario 1: Service Won't Start

**Problem**: A container fails to start

**Solution**:
```bash
# Check container logs
docker-compose logs [service-name]

# Check for port conflicts
netstat -tulpn | grep :3000

# Restart the service
docker-compose restart [service-name]
```

### Scenario 2: Database Connection Issues

**Problem**: Can't connect to ChromaDB

**Solution**:
```bash
# Check ChromaDB status
docker-compose logs chromadb

# Verify network connectivity
docker exec -it [container-name] ping chromadb

# Check database configuration
docker exec -it [container-name] curl http://localhost:8000/api/v2/heartbeat
```

### Scenario 3: Authentication Failures

**Problem**: JWT tokens are invalid

**Solution**:
```bash
# Check JWT configuration
echo $JWT_SECRET

# Verify token generation
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@memory-service.com", "password": "password"}'

# Check token expiration
echo "Your token should be 24 hours"
```

### Scenario 4: Performance Issues

**Problem**: System is slow

**Solution**:
```bash
# Check resource usage
docker stats

# Check cache performance
docker exec [container-name] python -c "
from src.caching.storage_caching import get_cache_manager
cache = get_cache_manager()
print(cache.get_stats())
"

# Monitor database queries
docker exec [container-name] sqlite3 memory_system.db \".schema\"
```

### Scenario 5: Memory Storage Issues

**Problem**: Memories aren't being stored or retrieved

**Solution**:
```bash
# Check memory service logs
docker-compose logs memory-service

# Test database connectivity
docker exec [container-name] curl http://localhost:3000/health

# Verify memory storage
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"content": "test", "type": "test", "session_id": "test"}'
```

## Maintenance Guidelines

### 1. Regular Maintenance Tasks

**Daily**:
- Check service health: `docker-compose ps`
- Monitor logs for errors: `docker-compose logs`
- Check disk space: `df -h`

**Weekly**:
- Update dependencies: `npm update` and `pip install --upgrade`
- Clean up old logs: `docker system prune`
- Check database performance: `docker exec [container-name] sqlite3 memory_system.db \"SELECT COUNT(*) FROM memory_entries\"`

**Monthly**:
- Review security patches
- Update Docker images: `docker-compose pull`
- Backup database: `docker exec [container-name] sqlite3 memory_system.db \".backup backup.db\"`

### 2. Performance Monitoring

Monitor key metrics:
- Response times
- Memory usage
- Database query performance
- Cache hit rates

```bash
# Monitor cache performance
docker exec [container-name] python -c "
from src.caching.storage_caching import get_cache_manager
cache = get_cache_manager()
stats = cache.get_stats()
print(f'Cache hit rate: {stats[\"hit_rate\"]:.2f}%')
print(f'Cache size: {stats[\"size\"]}/{stats[\"max_size\"]}')
"

# Monitor database performance
docker exec [container-name] sqlite3 memory_system.db \"EXPLAIN QUERY PLAN SELECT * FROM memory_entries LIMIT 10\"
```

### 3. Security Maintenance

**Regular Security Checks**:
- Update dependencies regularly
- Review JWT secrets
- Check for security vulnerabilities
- Monitor access logs

```bash
# Check for security vulnerabilities
npm audit
pip-audit

# Review access logs
docker-compose logs | grep -i \"error\"
```

### 4. Backup and Recovery

**Backup Strategy**:
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec memory-service sqlite3 memory_system.db ".backup /backup/memory_backup_$DATE.db"
docker exec chromadb sh -c "mongodump --out /backup/mongo_backup_$DATE"
echo "Backup completed: $DATE"
EOF

# Set up automated backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

**Recovery Process**:
```bash
# Restore from backup
docker exec memory-service sqlite3 memory_system.db ".restore /backup/memory_backup_20231230_020000.db"
docker exec chromadb mongorestore /backup/mongo_backup_20231230_020000
```

## Expansion Possibilities

### 1. Adding New Domains

To add a new domain (e.g., "medical_discussions"):

```python
# Add domain validation in src/memory/multi-domain-memory-system.py
def _validate_medical_discussions(self, data: Dict[str, Any]):
    """Validate medical discussions memory content"""
    required_fields = ["discussion_topic", "participants", "medical_context"]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field for medical discussions: {field}")
    
    # Add medical-specific validation logic
    if "patient_id" in data and not isinstance(data["patient_id"], str):
        raise ValueError("Patient ID must be a string")

# Add domain to domain_validators
self.domain_validators["medical_discussions"] = self._validate_medical_discussions
```

### 2. Scaling the System

**Horizontal Scaling**:
```yaml
# Add to docker-compose.yml
services:
  memory-service-replica:
    build:
      context: memory-service
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      - chromadb
    restart: unless-stopped
```

**Load Balancing Enhancement**:
```python
# Enhance load balancer in src/load-balancer/load-balancer.py
def _weighted_round_robin(self, service_name: str) -> ServiceEndpoint:
    """Implement weighted round-robin algorithm"""
    services = [s for s in self.services.values() if s.healthy]
    if not services:
        return None
    
    # Calculate weights and select appropriate service
    total_weight = sum(s.weight for s in services)
    if total_weight == 0:
        return services[0]  # Fallback to first service
    
    # Implement weighted selection logic
    import random
    rand_weight = random.randint(1, total_weight)
    current_weight = 0
    
    for service in services:
        current_weight += service.weight
        if rand_weight <= current_weight:
            return service
    
    return services[-1]  # Fallback
```

### 3. Machine Learning Integration

**Enhanced Search Capabilities**:
```python
# Add semantic search in src/memory/multi-domain-memory-system.py
def semantic_search(self, query: str, domain: str, limit: int = 10) -> List[MemoryEntry]:
    """Perform semantic search using embeddings"""
    # This would integrate with a machine learning model
    # for better semantic understanding
    
    # Placeholder for semantic search implementation
    memories = self.storage.search_memories(domain=domain, limit=limit * 2)
    
    # Score memories based on semantic similarity
    scored_memories = []
    for memory in memories:
        similarity_score = self._calculate_semantic_similarity(query, memory.content_data)
        memory.similarity_score = similarity_score
        scored_memories.append(memory)
    
    # Sort by similarity and return top results
    scored_memories.sort(key=lambda x: x.similarity_score, reverse=True)
    return scored_memories[:limit]

def _calculate_semantic_similarity(self, query: str, content: Dict[str, Any]) -> float:
    """Calculate semantic similarity between query and content"""
    # This would use a pre-trained model like BERT or similar
    # For now, return a simple placeholder score
    query_words = set(query.lower().split())
    content_str = json.dumps(content, default=str).lower()
    content_words = set(content_str.split())
    
    intersection = len(query_words & content_words)
    union = len(query_words | content_words)
    
    return intersection / union if union > 0 else 0.0
```

### 4. Real-time Features

**WebSocket Integration**:
```javascript
// Add to memory-service/src/index.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server: app });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Handle different message types
    switch(data.type) {
      case 'subscribe':
        // Subscribe to memory updates
        break;
      case 'unsubscribe':
        // Unsubscribe from memory updates
        break;
      case 'search':
        // Perform real-time search
        break;
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast memory updates to connected clients
function broadcastMemoryUpdate(memory) {
  const message = JSON.stringify({
    type: 'memory_update',
    data: memory
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
```

### 5. Advanced Analytics

**Usage Analytics**:
```python
# Add analytics to src/memory/multi-domain-memory-system.py
class MemoryAnalytics:
    """Analytics and reporting for memory system"""
    
    def __init__(self, storage: MemoryStorage):
        self.storage = storage
    
    def get_usage_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics for the specified period"""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get memories from the period
        memories = self.storage.search_memories(limit=10000)
        recent_memories = [
            m for m in memories 
            if datetime.fromisoformat(m.timestamp) >= cutoff_date
        ]
        
        # Calculate statistics
        stats = {
            "total_memories": len(recent_memories),
            "domain_distribution": {},
            "content_type_distribution": {},
            "daily_activity": {},
            "top_tags": {},
            "average_content_length": 0
        }
        
        # Calculate distributions
        for memory in recent_memories:
            # Domain distribution
            domain = memory.domain
            stats["domain_distribution"][domain] = stats["domain_distribution"].get(domain, 0) + 1
            
            # Content type distribution
            content_type = memory.content_type
            stats["content_type_distribution"][content_type] = stats["content_type_distribution"].get(content_type, 0) + 1
            
            # Daily activity
            date = memory.timestamp.split('T')[0]
            stats["daily_activity"][date] = stats["daily_activity"].get(date, 0) + 1
            
            # Top tags
            for tag in memory.tags:
                stats["top_tags"][tag] = stats["top_tags"].get(tag, 0) + 1
            
            # Average content length
            content_length = len(json.dumps(memory.content_data))
            stats["average_content_length"] += content_length
        
        stats["average_content_length"] = stats["average_content_length"] / len(recent_memories) if recent_memories else 0
        
        return stats
```

## Best Practices for Junior Engineers

### 1. Code Quality

**Write Clean, Readable Code**:
- Use meaningful variable names
- Add comments explaining complex logic
- Follow consistent formatting
- Break down large functions into smaller, focused ones

**Example**:
```python
# Good: Clear and descriptive
def validate_memory_content(content_data: Dict[str, Any], domain: str) -> bool:
    """Validate memory content based on domain requirements"""
    domain_validator = self.domain_validators.get(domain)
    if not domain_validator:
        raise ValueError(f"Unknown domain: {domain}")
    
    domain_validator(content_data)
    return True

# Bad: Unclear and hard to understand
def chk(c, d):
    if d not in v:
        raise ValueError(f"Unknown domain: {d}")
    v[d](c)
    return True
```

### 2. Error Handling

**Handle Errors Gracefully**:
```python
# Good: Comprehensive error handling
def store_memory_entry(memory_data: Dict[str, Any]) -> str:
    """Store a memory entry with proper error handling"""
    try:
        # Validate required fields
        required_fields = ["content", "type", "session_id"]
        for field in required_fields:
            if field not in memory_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate domain
        if memory_data["domain"] not in self.domain_validators:
            raise ValueError(f"Invalid domain: {memory_data['domain']}")
        
        # Store memory
        memory_entry = MemoryEntry(**memory_data)
        return self.storage.store_memory(memory_entry)
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error storing memory: {e}")
        raise
```

### 3. Testing

**Write Comprehensive Tests**:
```python
# Good: Test both success and failure cases
def test_memory_storage():
    """Test memory storage functionality"""
    # Test successful storage
    memory_data = {
        "content": "Test memory content",
        "type": "technical",
        "session_id": "test-session",
        "domain": "bmad_code"
    }
    
    memory_id = memory_manager.store_conversation(**memory_data)
    assert memory_id is not None
    
    # Test retrieval
    retrieved_memory = memory_manager.storage.retrieve_memory(memory_id)
    assert retrieved_memory is not None
    assert retrieved_memory.content == memory_data["content"]
    
    # Test validation errors
    with pytest.raises(ValueError):
        memory_manager.store_conversation(
            content="",  # Empty content should fail
            type="technical",
            session_id="test-session",
            domain="bmad_code"
        )
```

### 4. Documentation

**Document Your Code**:
```python
def advanced_search_memories(
    self,
    domain: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    min_confidence: float = 0.0,
    max_confidence: float = 1.0,
    date_range: Optional[tuple] = None,
    limit: int = 100,
    sort_by: str = "timestamp",
    sort_order: str = "DESC"
) -> Dict[str, Any]:
    """
    Perform advanced search with multiple filtering options.
    
    Args:
        domain: Filter by memory domain (bmad_code, website_info, etc.)
        keywords: List of keywords to search for
        min_confidence: Minimum confidence score (0.0-1.0)
        max_confidence: Maximum confidence score (0.0-1.0)
        date_range: Tuple of (start_date, end_date) for date filtering
        limit: Maximum number of results to return
        sort_by: Field to sort results by
        sort_order: Sort direction ('ASC' or 'DESC')
    
    Returns:
        Dictionary containing search results and metadata
        
    Example:
        >>> results = memory_manager.advanced_search_memories(
        ...     domain="bmad_code",
        ...     keywords=["function", "algorithm"],
        ...     min_confidence=0.8,
        ...     limit=50
        ... )
        >>> print(f"Found {len(results['memories'])} memories")
    """
```

### 5. Performance Optimization

**Optimize for Performance**:
```python
# Good: Use efficient data structures and algorithms
def search_memories_optimized(self, query: str, limit: int = 100) -> List[MemoryEntry]:
    """Optimized search with caching and efficient indexing"""
    # Check cache first
    cache_key = f"search_{hashlib.md5(query.encode()).hexdigest()}"
    cached_result = self.cache.get(cache_key)
    if cached_result:
        return cached_result[:limit]
    
    # Use database indexes for efficient searching
    memories = self.storage.search_memories(
        keyword=query,
        limit=limit * 2,  # Get more initially for filtering
        offset=0
    )
    
    # Apply additional filtering and scoring
    filtered_memories = self._filter_and_score_memories(memories, query)
    
    # Cache the result
    self.cache.set(cache_key, filtered_memories, ttl=300)  # 5 minute cache
    
    return filtered_memories[:limit]
```

## Conclusion

The Comprehensive Memory System is a powerful platform for managing information across multiple domains. As a junior engineer, you now have the knowledge to:

1. **Understand the architecture** and how components interact
2. **Deploy the system** in new environments
3. **Implement new features** and domains
4. **Maintain and troubleshoot** the system effectively
5. **Expand the system** with new capabilities

Remember that the key to success with this system is understanding the domain-specific requirements and ensuring that data is stored, validated, and retrieved correctly. Always test your changes thoroughly and document your work for future reference.

The system is designed to be flexible and extensible, so don't hesitate to explore new ways to enhance its capabilities. With the knowledge you've gained from this guide, you're well-equipped to work with and improve the Comprehensive Memory System.

---

## Memory System Usage Examples

This section provides comprehensive examples demonstrating how to use all features of the memory system through a CRUD (Create, Read, Update, Delete) process. Each example includes the prompt explanation, the corresponding MCP function call, and the expected results.

### Overview of CRUD Operations

The memory system supports four fundamental operations that form the complete data lifecycle:

1. **Commit (Create)**: Store new memories in the system
2. **Verify (Read/Check)**: Check if data exists and retrieve specific information
3. **Recall (Read/Retrieve)**: Retrieve existing memories and related information
4. **Forget (Delete)**: Remove memories from the system

---

### 1. Commit Operations (Create New Memories)

#### Example 1: Storing a Technical Discussion

**Prompt**: "Store a conversation about a JavaScript function implementation"

**Explanation**: This prompt requests storing a technical discussion about JavaScript coding. The system will validate this as a BMAD Code domain entry and store it with appropriate metadata.

**MCP Function**: `mcp_memory_store_memory`

```python
# Example data structure for storing technical discussions
memory_data = {
    "domain": "bmad_code",
    "content_data": {
        "code_snippet": "function calculateSum(a, b) { return a + b; }",
        "conversation_context": "Discussion about utility functions for mathematical operations",
        "project_id": "math-utilities",
        "technical_specs": {
            "language": "JavaScript",
            "framework": "Node.js",
            "complexity": "O(1)",
            "use_case": "Basic arithmetic operations"
        }
    },
    "source": "code-review",
    "tags": ["javascript", "utility", "math", "function"],
    "confidence": 0.95
}

# Store the memory
memory_id = memory_manager.store_conversation(
    domain=memory_data["domain"],
    conversation_data=memory_data["content_data"],
    source=memory_data["source"],
    tags=memory_data["tags"],
    confidence=memory_data["confidence"]
)
```

**Expected Result**: Returns a unique memory ID that can be used for future reference.

#### Example 2: Storing Website Information

**Prompt**: "Save information about a web development tutorial from MDN"

**Explanation**: This prompt requests storing website content analysis. The system validates this as Website Info domain and stores it with web-specific metadata.

**MCP Function**: `mcp_memory_store_website_info`

```python
# Example data structure for website information
website_data = {
    "domain": "website_info",
    "content_data": {
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        "content_summary": "Comprehensive guide to JavaScript programming language fundamentals",
        "content_categories": ["tutorial", "documentation", "web-development"],
        "website_metadata": {
            "title": "JavaScript | MDN",
            "author": "Mozilla Developer Network",
            "publish_date": "2024-01-15",
            "content_type": "educational"
        }
    },
    "source": "web-scraper",
    "tags": ["javascript", "tutorial", "documentation", "web-dev"],
    "confidence": 0.90
}

# Store the website information
memory_id = memory_manager.store_website_info(
    domain=website_data["domain"],
    content_data=website_data["content_data"],
    source=website_data["source"],
    tags=website_data["tags"],
    confidence=website_data["confidence"]
)
```

**Expected Result**: Returns a unique memory ID for the website entry.

---

### 2. Verify Operations (Check Data Existence)

#### Example 1: Checking if Technical Memory Exists

**Prompt**: "Check if there's existing information about JavaScript utility functions"

**Explanation**: This prompt requests verification of existing technical memories related to JavaScript utility functions. The system searches through stored memories and returns existence status.

**MCP Function**: `mcp_memory_verify_existence`

```python
# Check for existing technical memories
search_criteria = {
    "domain": "bmad_code",
    "keywords": ["javascript", "utility", "function"],
    "min_confidence": 0.8,
    "limit": 5
}

# Verify existence and get count
verification_result = memory_manager.verify_memory_existence(
    domain=search_criteria["domain"],
    keywords=search_criteria["keywords"],
    min_confidence=search_criteria["min_confidence"]
)

print(f"Found {verification_result['count']} matching memories")
print(f"Exists: {verification_result['exists']}")
```

**Expected Result**: Returns a boolean indicating existence and a count of matching memories.

#### Example 2: Verifying Website Information

**Prompt**: "Verify if information about MDN JavaScript documentation exists"

**Explanation**: This prompt requests verification of existing website information about MDN JavaScript documentation. The system checks the website_info domain for relevant entries.

**MCP Function**: `mcp_memory_verify_website_info`

```python
# Check for existing website information
website_verification = memory_manager.verify_website_info(
    url_pattern="developer.mozilla.org",
    content_categories=["documentation", "tutorial"],
    min_confidence=0.7
)

print(f"Website info exists: {website_verification['exists']}")
print(f"Matching entries: {website_verification['count']}")
```

**Expected Result**: Returns existence status and count of matching website entries.

---

### 3. Recall Operations (Retrieve Existing Memories)

#### Example 1: Recalling Technical Discussions

**Prompt**: "Retrieve all technical discussions about JavaScript functions"

**Explanation**: This prompt requests retrieval of all technical memories related to JavaScript functions. The system searches through the bmad_code domain and returns relevant memories with contextual information.

**MCP Function**: `mcp_memory_recall_technical_discussions`

```python
# Retrieve technical discussions
retrieval_criteria = {
    "domain": "bmad_code",
    "keywords": ["javascript", "function"],
    "limit": 10,
    "sort_by": "timestamp",
    "sort_order": "DESC"
}

# Retrieve memories
memories = memory_manager.recall_technical_discussions(
    domain=retrieval_criteria["domain"],
    keywords=retrieval_criteria["keywords"],
    limit=retrieval_criteria["limit"],
    sort_by=retrieval_criteria["sort_by"],
    sort_order=retrieval_criteria["sort_order"]
)

for memory in memories["memories"]:
    print(f"Memory ID: {memory['id']}")
    print(f"Content: {memory['content_data']['conversation_context']}")
    print(f"Tags: {memory['tags']}")
    print(f"Confidence: {memory['confidence']}")
    print("---")
```

**Expected Result**: Returns a list of memories with their complete data structure, including content, metadata, and contextual information.

#### Example 2: Recalling Website Information

**Prompt**: "Get information about web development tutorials"

**Explanation**: This prompt requests retrieval of website information related to web development tutorials. The system searches the website_info domain and returns relevant entries with detailed metadata.

**MCP Function**: `mcp_memory_recall_website_information`

```python
# Retrieve website information
website_criteria = {
    "content_categories": ["tutorial", "web-development"],
    "min_confidence": 0.8,
    "limit": 15,
    "date_range": ("2024-01-01", "2024-12-31")
}

# Retrieve website information
website_memories = memory_manager.recall_website_information(
    categories=website_criteria["content_categories"],
    min_confidence=website_criteria["min_confidence"],
    limit=website_criteria["limit"],
    date_range=website_criteria["date_range"]
)

for memory in website_memories["memories"]:
    print(f"URL: {memory['content_data']['url']}")
    print(f"Title: {memory['content_data']['website_metadata']['title']}")
    print(f"Summary: {memory['content_data']['content_summary']}")
    print(f"Tags: {memory['tags']}")
    print("---")
```

**Expected Result**: Returns a list of website memories with URLs, titles, summaries, and associated metadata.

---

### 4. Forget Operations (Delete Memories)

#### Example 1: Forgetting Technical Discussions

**Prompt**: "Remove outdated technical discussions about deprecated JavaScript features"

**Explanation**: This prompt requests deletion of outdated technical memories. The system identifies memories related to deprecated JavaScript features and removes them from storage.

**MCP Function**: `mcp_memory_forget_technical_discussions`

```python
# Identify outdated technical discussions
deletion_criteria = {
    "domain": "bmad_code",
    "keywords": ["deprecated", "obsolete", "old javascript"],
    "max_age_days": 365,  # Only delete entries older than 1 year
    "confirmation_required": True
}

# Forget technical discussions
forget_result = memory_manager.forget_technical_discussions(
    domain=deletion_criteria["domain"],
    keywords=deletion_criteria["keywords"],
    max_age_days=deletion_criteria["max_age_days"],
    confirmation=deletion_criteria["confirmation_required"]
)

print(f"Deleted {forget_result['deleted_count']} memories")
print(f"Operation status: {forget_result['status']}")
```

**Expected Result**: Returns deletion status and count of removed memories.

#### Example 2: Forgetting Website Information

**Prompt**: "Remove outdated website information about discontinued web technologies"

**Explanation**: This prompt requests deletion of outdated website information. The system identifies memories about discontinued web technologies and removes them from the website_info domain.

**MCP Function**: `mcp_memory_forget_website_information`

```python
# Identify outdated website information
website_deletion = {
    "url_patterns": ["discontinued-tech", "obsolete-protocol"],
    "max_age_days": 180,  # Delete entries older than 6 months
    "content_categories": ["deprecated", "obsolete"],
    "confirmation_required": True
}

# Forget website information
forget_result = memory_manager.forget_website_information(
    url_patterns=website_deletion["url_patterns"],
    max_age_days=website_deletion["max_age_days"],
    content_categories=website_deletion["content_categories"],
    confirmation=website_deletion["confirmation_required"]
)

print(f"Deleted {forget_result['deleted_count']} website entries")
print(f"Operation status: {forget_result['status']}")
```

**Expected Result**: Returns deletion status and count of removed website entries.

---

### 5. Advanced CRUD Operations

#### Example 1: Bulk Memory Operations

**Prompt**: "Perform bulk operations: store multiple technical discussions, verify their existence, then retrieve and delete specific ones"

**Explanation**: This demonstrates a complete CRUD workflow involving multiple operations in sequence. The system stores several memories, verifies their existence, retrieves specific ones, and then deletes selected entries.

**MCP Functions**: Multiple functions working together

```python
# Step 1: Store multiple technical discussions
technical_discussions = [
    {
        "domain": "bmad_code",
        "content_data": {
            "code_snippet": "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }",
            "conversation_context": "Recursive Fibonacci function implementation",
            "project_id": "math-algorithms",
            "complexity": "O(2^n)"
        },
        "source": "code-review",
        "tags": ["javascript", "recursion", "fibonacci", "math"],
        "confidence": 0.92
    },
    {
        "domain": "bmad_code", 
        "content_data": {
            "code_snippet": "function quickSort(arr) { if (arr.length <= 1) return arr; const pivot = arr[0]; const left = []; const right = []; for (let i = 1; i < arr.length; i++) { arr[i] < pivot ? left.push(arr[i]) : right.push(arr[i]); } return [...quickSort(left), pivot, ...quickSort(right)]; }",
            "conversation_context": "Quick sort algorithm implementation",
            "project_id": "sorting-algorithms",
            "complexity": "O(n log n)"
        },
        "source": "algorithm-study",
        "tags": ["javascript", "sorting", "quicksort", "algorithms"],
        "confidence": 0.88
    }
]

# Store multiple memories
stored_memories = []
for discussion in technical_discussions:
    memory_id = memory_manager.store_conversation(
        domain=discussion["domain"],
        conversation_data=discussion["content_data"],
        source=discussion["source"],
        tags=discussion["tags"],
        confidence=discussion["confidence"]
    )
    stored_memories.append(memory_id)

print(f"Stored {len(stored_memories)} memories: {stored_memories}")

# Step 2: Verify existence of stored memories
verification_results = []
for memory_id in stored_memories:
    verification = memory_manager.verify_memory_existence(
        domain="bmad_code",
        memory_id=memory_id
    )
    verification_results.append((memory_id, verification["exists"]))

print("Verification results:")
for memory_id, exists in verification_results:
    print(f"Memory {memory_id}: {'Exists' if exists else 'Does not exist'}")

# Step 3: Retrieve specific memories
retrieved_memories = memory_manager.recall_technical_discussions(
    domain="bmad_code",
    keywords=["javascript", "algorithm"],
    limit=10,
    sort_by="timestamp",
    sort_order="DESC"
)

print(f"Retrieved {len(retrieved_memories['memories'])} memories")

# Step 4: Delete specific memories (confirmation required)
memories_to_delete = stored_memories[:1]  # Delete first memory
deletion_result = memory_manager.forget_technical_discussions(
    domain="bmad_code",
    memory_ids=memories_to_delete,
    confirmation=True
)

print(f"Deleted {deletion_result['deleted_count']} memories")
```

**Expected Result**: Complete CRUD workflow demonstrating storing, verifying, retrieving, and deleting operations.

#### Example 2: Advanced Search and Filter Operations

**Prompt**: "Perform advanced search with multiple filters: find recent technical discussions with specific tags, high confidence, and date range"

**Explanation**: This demonstrates advanced search capabilities combining multiple filtering criteria. The system searches through technical discussions using complex filters to find highly relevant, recent memories.

**MCP Function**: `mcp_memory_advanced_search`

```python
# Advanced search with multiple filters
advanced_search = {
    "domain": "bmad_code",
    "keywords": ["javascript", "algorithm", "performance"],
    "tags": ["javascript", "sorting", "optimization"],
    "min_confidence": 0.85,
    "max_confidence": 1.0,
    "date_range": ("2024-01-01", "2024-12-31"),
    "content_types": ["conversation", "code_snippet"],
    "limit": 20,
    "sort_by": "confidence",
    "sort_order": "DESC"
}

# Perform advanced search
search_results = memory_manager.advanced_search(
    domain=advanced_search["domain"],
    keywords=advanced_search["keywords"],
    tags=advanced_search["tags"],
    min_confidence=advanced_search["min_confidence"],
    max_confidence=advanced_search["max_confidence"],
    date_range=advanced_search["date_range"],
    content_types=advanced_search["content_types"],
    limit=advanced_search["limit"],
    sort_by=advanced_search["sort_by"],
    sort_order=advanced_search["sort_order"]
)

print(f"Search completed in {search_results['query_time_ms']}ms")
print(f"Found {search_results['total_matches']} matching memories")
print(f"Returning {len(search_results['memories'])} memories")

for memory in search_results["memories"]:
    print(f"Memory ID: {memory['id']}")
    print(f"Confidence: {memory['confidence']}")
    print(f"Tags: {memory['tags']}")
    print(f"Timestamp: {memory['timestamp']}")
    print(f"Context: {memory['content_data']['conversation_context']}")
    print("---")
```

**Expected Result**: Returns highly filtered and sorted results based on complex search criteria.

---

### 6. Error Handling and Edge Cases

#### Example 1: Handling Non-Existent Memories

**Prompt**: "Attempt to retrieve a memory that doesn't exist"

**Explanation**: This demonstrates proper error handling when attempting to access memories that don't exist. The system gracefully handles the request and provides appropriate feedback.

**MCP Function**: `mcp_memory_recall_with_error_handling`

```python
# Attempt to retrieve non-existent memory
try:
    memory = memory_manager.recall_memory_by_id("non-existent-memory-id")
    print(f"Memory found: {memory['id']}")
except ValueError as e:
    print(f"Memory not found: {str(e)}")
except Exception as e:
    print(f"Unexpected error: {str(e)}")

# Alternative approach with existence check
if memory_manager.verify_memory_existence(memory_id="non-existent-memory-id")["exists"]:
    memory = memory_manager.recall_memory_by_id("non-existent-memory-id")
    print(f"Memory found: {memory['id']}")
else:
    print("Memory does not exist - no error raised")
```

**Expected Result**: Graceful handling of non-existent memories with appropriate error messages or status indicators.

#### Example 2: Handling Invalid Input Data

**Prompt**: "Attempt to store memory with invalid domain or missing required fields"

**Explanation**: This demonstrates proper validation of input data. The system validates domain specifications and required fields before attempting storage.

**MCP Function**: `mcp_memory_store_with_validation`

```python
# Test invalid domain
invalid_domain_data = {
    "domain": "invalid_domain",  # Not in supported domains
    "content_data": {"message": "test"},
    "source": "test"
}

try:
    memory_manager.store_conversation(**invalid_domain_data)
except ValueError as e:
    print(f"Domain validation failed: {str(e)}")

# Test missing required fields
missing_fields_data = {
    "domain": "bmad_code",
    "content_data": {"message": "test"},  # Missing required fields for BMAD code
    "source": "test"
}

try:
    memory_manager.store_conversation(**missing_fields_data)
except ValueError as e:
    print(f"Field validation failed: {str(e)}")
```

**Expected Result**: Proper validation with descriptive error messages for invalid inputs.

---

### Summary of CRUD Operations

| Operation | Purpose | Key Functions | Use Cases |
|-----------|---------|---------------|-----------|
| **Commit (Create)** | Store new memories | `store_conversation`, `store_website_info` | Adding new technical discussions, website information |
| **Verify (Check)** | Confirm data existence | `verify_memory_existence`, `verify_website_info` | Checking if information already exists |
| **Recall (Retrieve)** | Get existing memories | `recall_technical_discussions`, `recall_website_information` | Searching and retrieving stored information |
| **Forget (Delete)** | Remove memories | `forget_technical_discussions`, `forget_website_information` | Cleaning up outdated or irrelevant data |

These examples provide a comprehensive understanding of how to use the memory system effectively. Each operation follows the CRUD pattern and includes proper error handling, validation, and contextual understanding of the stored data.
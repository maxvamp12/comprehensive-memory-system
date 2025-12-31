# Memory System Engineering Guide

## A Complete Technical Reference for the Multi-Domain Memory System

**Document Version**: 1.0.0
**Last Updated**: December 31, 2025
**Intended Audience**: Junior to Senior Engineers
**Prerequisites**: Basic Python knowledge, understanding of REST APIs

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [System Architecture](#2-system-architecture)
3. [The Memory Data Model](#3-the-memory-data-model)
4. [ChromaDB Integration: From Text to Vectors](#4-chromadb-integration-from-text-to-vectors)
5. [The MCP Protocol and Server](#5-the-mcp-protocol-and-server)
6. [Complete API Reference](#6-complete-api-reference)
7. [Domain System and Keyword Expansion](#7-domain-system-and-keyword-expansion)
8. [Adding New Domains](#8-adding-new-domains)
9. [Creating New MCP Servers](#9-creating-new-mcp-servers)
10. [Deployment and Operations](#10-deployment-and-operations)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Executive Overview

### 1.1 What is the Memory System?

The Multi-Domain Memory System is a **persistent memory solution** that allows AI coding assistants (like Claude Code, OpenCode, or any MCP-compatible tool) to store, retrieve, and search information across coding sessions. Think of it as a "long-term memory" for your AI assistant.

**Key Capabilities:**
- **Store** conversations, code snippets, decisions, and knowledge
- **Retrieve** relevant memories using keyword or semantic search
- **Organize** memories by domain (code, websites, electronics, etc.)
- **Persist** data across sessions using ChromaDB vector database

### 1.2 Why Do We Need This?

AI assistants typically have no memory between sessions. Every new conversation starts fresh. This system solves that by:

1. **Preserving Context**: Important decisions and patterns are remembered
2. **Avoiding Repetition**: The AI can recall past solutions
3. **Building Knowledge**: Over time, the system becomes more valuable
4. **Semantic Search**: Find relevant memories even with different wording

### 1.3 System Components at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Coding Assistant                          │
│                (Claude Code, OpenCode, etc.)                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ MCP Protocol (JSON-RPC over HTTP/SSE)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MCP Memory Server                               │
│                   (CLU: 192.168.68.71:8200)                         │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  store_memory   │  │retrieve_memories│  │ expand_keywords     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ChromaDB Vector Database                        │
│                   (SARK: 192.168.68.69:8001)                        │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ memory_      │ │ memory_      │ │ memory_      │ │ memory_    │  │
│  │ bmad_code    │ │ website_info │ │ religious_   │ │ electronics│  │
│  │              │ │              │ │ discussions  │ │ _maker     │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### 2.1 The Three-Layer Architecture

The memory system uses a three-layer architecture:

```
Layer 1: MCP Server Layer (memory-system-mcp-server.py)
         ↓
         Handles MCP protocol, exposes tools to AI assistants

Layer 2: Memory Manager Layer (multi_domain_memory_system.py)
         ↓
         Business logic, validation, keyword expansion

Layer 3: Storage Layer (chromadb_storage.py)
         ↓
         Vector database operations, embedding generation
```

### 2.2 File Structure

```
comprehensive-memory-system/
├── src/
│   └── memory/
│       ├── __init__.py
│       ├── multi_domain_memory_system.py    # Core memory logic
│       └── chromadb_storage.py              # ChromaDB backend
│
├── .opencode/
│   └── mcp/
│       └── memory-system-mcp-server.py      # MCP server
│
└── docs/
    └── engineering/
        └── memory-system-engineering-guide.md  # This document
```

### 2.3 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| MCP Server | FastMCP (Python) | Implements Model Context Protocol |
| HTTP Server | Uvicorn/ASGI | Serves SSE endpoints |
| Memory Manager | Python dataclasses | Business logic and validation |
| Vector Database | ChromaDB | Stores embeddings and documents |
| Embeddings | Hash-based (placeholder) | Converts text to vectors |
| Transport | HTTP/SSE | Network communication |

### 2.4 Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your Development Machine                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AI Coding Assistant (Claude Code / OpenCode)            │   │
│  │ Connects to: http://192.168.68.71:8200/sse              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Network (LAN)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLU Server (192.168.68.71)                                      │
│                                                                 │
│ ┌─────────────────────────────────────────┐                     │
│ │ MCP Memory Server Container             │                     │
│ │ Port: 8200                              │                     │
│ │ Image: mcp-memory-system:latest         │──────┐              │
│ └─────────────────────────────────────────┘      │              │
└──────────────────────────────────────────────────│──────────────┘
                                                   │
                                                   │ HTTP API
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ SARK Server (192.168.68.69)                                     │
│                                                                 │
│ ┌─────────────────────────────────────────┐                     │
│ │ ChromaDB Container                      │                     │
│ │ Port: 8001                              │                     │
│ │ Image: chromadb/chroma:0.5.23           │                     │
│ └─────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. The Memory Data Model

### 3.1 What is a Memory Entry?

A **Memory Entry** is the fundamental unit of storage. It represents a single piece of information that the system remembers.

```python
@dataclass
class MemoryEntry:
    """Represents a memory entry in the multi-domain system"""

    id: str                           # Unique identifier (UUID)
    domain: str                       # Which category (bmad_code, etc.)
    subdomain: Optional[str]          # Optional sub-category
    content_type: str                 # Type: "conversation", "code", etc.
    content_data: Dict[str, Any]      # The actual content
    metadata: Dict[str, Any]          # Additional info about the memory
    tags: List[str]                   # Searchable tags
    timestamp: str                    # When it was created (ISO format)
    source: str                       # Where it came from
    confidence: float                 # How reliable (0.0 to 1.0)
    context: Dict[str, Any]           # Surrounding context
    relevance_score: float            # Search relevance (computed)
    similarity_score: float           # Vector similarity (computed)
```

### 3.2 Understanding Each Field

#### `id` - Unique Identifier
```python
id = "94b4f4ae-40f8-446a-8317-32f3137fb0a1"
```
A UUID that uniquely identifies this memory. Generated automatically when storing.

#### `domain` - Memory Category
```python
domain = "bmad_code"  # One of: bmad_code, website_info, religious_discussions, electronics_maker
```
The domain determines:
- Which ChromaDB collection stores it
- Which validation rules apply
- Which keywords are relevant for expansion

#### `content_data` - The Actual Content
This is where the real information lives. Structure depends on domain:

```python
# For bmad_code domain:
content_data = {
    "code_snippet": "def hello_world():\n    print('Hello!')",
    "conversation_context": "Discussion about Python functions",
    "project_id": "my_project_001",
    "participants": ["user", "assistant"]
}

# For website_info domain:
content_data = {
    "url": "https://example.com/article",
    "content_summary": "Article about Python best practices",
    "website_metadata": {"title": "Python Tips", "author": "Jane Doe"}
}
```

#### `tags` - Searchable Labels
```python
tags = ["python", "functions", "beginner", "tutorial"]
```
Tags enable quick filtering and categorization.

#### `confidence` - Reliability Score
```python
confidence = 0.95  # Very confident
confidence = 0.5   # Somewhat uncertain
```
Use this to indicate how reliable the information is.

### 3.3 Memory Lifecycle

```
1. Creation
   ├── AI assistant calls store_memory
   ├── Content validated against domain rules
   ├── Embedding generated from content
   └── Stored in ChromaDB collection

2. Retrieval
   ├── AI assistant calls retrieve_memories
   ├── Query converted to embedding (if semantic search)
   ├── ChromaDB finds similar vectors
   └── Results parsed and returned

3. Usage
   ├── AI uses memory to inform responses
   ├── Memory may be updated with new context
   └── Relevance scores help prioritize

4. Cleanup (Optional)
   ├── Old memories can be expired
   └── Low-confidence memories pruned
```

---

## 4. ChromaDB Integration: From Text to Vectors

### 4.1 What is a Vector Database?

A **vector database** stores data as high-dimensional vectors (lists of numbers). This enables **semantic search** - finding similar content even when the exact words differ.

**Example:**
- Query: "How do I print in Python?"
- Matches: "Using print() function to output text" (same meaning, different words)

### 4.2 How Text Becomes Vectors

The conversion process (called "embedding") happens in three steps:

```
Step 1: Text Extraction
        ↓
        Gather all text from content_data, metadata, context

Step 2: Embedding Generation
        ↓
        Convert text to a 384-dimensional vector

Step 3: Storage
        ↓
        Store vector + document in ChromaDB
```

### 4.3 The Embedding Function (Current Implementation)

Currently, we use a **hash-based placeholder** for embeddings. This is deterministic but not semantically meaningful:

```python
def _generate_embedding_placeholder(self, text: str) -> List[float]:
    """
    Generate a simple hash-based embedding placeholder.
    In production, this should call vLLM or another embedding model.
    """
    # Create a deterministic 384-dimensional embedding from text hash
    embedding = []

    # Generate multiple hashes to get enough dimensions
    for seed in range(12):  # 12 * 32 = 384 dimensions
        hash_input = f"{text}:{seed}"
        text_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        for i in range(0, 64, 2):
            # Convert hex pairs to float values between -0.5 and 0.5
            val = int(text_hash[i:i+2], 16) / 255.0 - 0.5
            embedding.append(val)

    return embedding[:384]
```

**How it works:**
1. Take input text
2. Append a seed number (0-11)
3. Hash with SHA-256 (produces 64 hex characters)
4. Convert each hex pair to a float between -0.5 and 0.5
5. Repeat 12 times to get 384 dimensions

**Limitation:** This method doesn't understand meaning. "Python code" and "programming in Python" would have very different vectors.

### 4.4 Text Extraction for Embeddings

Before generating embeddings, we extract text from the memory:

```python
def _text_for_embedding(self, content_data: Dict, metadata: Dict, context: Dict) -> str:
    """Generate text for embedding from memory components"""
    parts = []

    # Add content data text
    for key, value in content_data.items():
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, (list, dict)):
            parts.append(json.dumps(value))

    # Add metadata text
    for key, value in metadata.items():
        if isinstance(value, str):
            parts.append(value)

    # Add context text
    for key, value in context.items():
        if isinstance(value, str):
            parts.append(value)

    return " ".join(parts)
```

### 4.5 ChromaDB Storage Structure

Each memory is stored with three components:

```python
# 1. The embedding vector (384 floats)
embedding = [0.123, -0.456, 0.789, ...]  # 384 values

# 2. The document (JSON string)
document = {
    "content_data": {...},
    "context": {...}
}

# 3. The metadata (flat key-value pairs)
chroma_metadata = {
    "domain": "bmad_code",
    "subdomain": "",
    "content_type": "conversation",
    "tags": '["python", "functions"]',  # JSON string
    "timestamp": "2025-12-31T12:00:00",
    "source": "claude-code-session",
    "confidence": 0.95,
    "metadata_json": '{"stored_by": "memory_system"}'  # JSON string
}
```

**Why JSON strings for complex fields?**
ChromaDB metadata only supports primitive types (string, int, float, bool). Lists and dicts must be serialized to JSON strings.

### 4.6 ChromaDB Collections

Each domain has its own collection:

| Domain | Collection Name | Purpose |
|--------|----------------|---------|
| bmad_code | memory_bmad_code | Programming, code snippets, BMAD methodology |
| website_info | memory_website_info | Web content, URLs, online resources |
| religious_discussions | memory_religious_discussions | Theological and spiritual topics |
| electronics_maker | memory_electronics_maker | Hardware, circuits, maker projects |

### 4.7 The HTTP API for ChromaDB

Since we use the HTTP API directly (for compatibility), here are the key endpoints:

```python
# Base URL
base_url = "http://192.168.68.69:8001"

# Health check
GET /api/v1/heartbeat
Response: {"nanosecond heartbeat": 1735689600000000000}

# List collections
GET /api/v1/collections
Response: [{"id": "...", "name": "memory_bmad_code", ...}]

# Create collection
POST /api/v1/collections
Body: {"name": "memory_new_domain", "metadata": {"domain": "new_domain"}}

# Add documents
POST /api/v1/collections/{collection_id}/add
Body: {
    "ids": ["memory-id-1"],
    "embeddings": [[0.1, 0.2, ...]],
    "documents": ["document text"],
    "metadatas": [{"key": "value"}]
}

# Query (semantic search)
POST /api/v1/collections/{collection_id}/query
Body: {
    "query_embeddings": [[0.1, 0.2, ...]],
    "n_results": 10,
    "where": {"domain": "bmad_code"}
}

# Get documents
POST /api/v1/collections/{collection_id}/get
Body: {
    "ids": ["memory-id-1"],
    "limit": 100
}

# Delete documents
POST /api/v1/collections/{collection_id}/delete
Body: {"ids": ["memory-id-1"]}

# Count documents
GET /api/v1/collections/{collection_id}/count
Response: 42
```

---

## 5. The MCP Protocol and Server

### 5.1 What is MCP?

**MCP (Model Context Protocol)** is a standardized way for AI assistants to communicate with external tools and services. It uses JSON-RPC over various transports (stdio, HTTP/SSE).

**Key concepts:**
- **Tools**: Functions the AI can call (like `store_memory`)
- **Transport**: How messages are sent (HTTP with Server-Sent Events)
- **JSON-RPC**: The message format (request/response with IDs)

### 5.2 MCP Message Flow

```
AI Assistant                    MCP Server                    ChromaDB
     │                              │                            │
     │  1. List available tools     │                            │
     │ ─────────────────────────►   │                            │
     │                              │                            │
     │  2. Tool definitions         │                            │
     │ ◄─────────────────────────   │                            │
     │                              │                            │
     │  3. Call store_memory        │                            │
     │ ─────────────────────────►   │                            │
     │                              │  4. Store in ChromaDB      │
     │                              │ ─────────────────────────► │
     │                              │                            │
     │                              │  5. Success                │
     │                              │ ◄───────────────────────── │
     │                              │                            │
     │  6. Tool result              │                            │
     │ ◄─────────────────────────   │                            │
```

### 5.3 The FastMCP Framework

We use **FastMCP** from the official MCP SDK. It simplifies creating MCP servers:

```python
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

# Configure security for network access
transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=False,  # Allow network access
    allowed_hosts=["*"],                     # Accept from any host
    allowed_origins=["*"],                   # Allow CORS from any origin
)

# Create the MCP server
mcp = FastMCP(
    name="memory-system",
    instructions="Multi-Domain Memory System v1.0.0...",
    transport_security=transport_security,
)
```

### 5.4 Defining MCP Tools

Tools are defined using the `@mcp.tool()` decorator:

```python
@mcp.tool()
def store_memory(
    domain: str,
    content_data: dict,
    source: str,
    content_type: str = "conversation",
    subdomain: Optional[str] = None,
    tags: Optional[List[str]] = None,
    confidence: float = 1.0,
) -> dict:
    """
    Store a memory entry in the multi-domain memory system.

    Args:
        domain: Memory domain (bmad_code, website_info, etc.)
        content_data: Memory content as a dictionary
        source: Source of the memory
        ...

    Returns:
        Dictionary with status and memory_id
    """
    return get_memory_interface().mcp_store_memory(
        domain=domain,
        content_data=content_data,
        source=source,
        ...
    )
```

**What the decorator does:**
1. Extracts function signature (parameters, types, docstring)
2. Registers function as an MCP tool
3. Generates JSON Schema for tool parameters
4. Handles JSON-RPC wrapping/unwrapping

### 5.5 Running the MCP Server

The server supports two modes:

```python
# Mode 1: stdio (for local development)
def run_stdio_server():
    """Run in stdio mode for local testing"""
    mcp.run()

# Mode 2: HTTP/SSE (for network deployment)
def run_http_server(host: str = "0.0.0.0", port: int = 8200):
    """Run in HTTP/SSE mode for network access"""
    import uvicorn
    app = mcp.sse_app()  # Get ASGI app for SSE transport
    uvicorn.run(app, host=host, port=port)
```

**Command line usage:**
```bash
# Local testing (stdio)
python memory-system-mcp-server.py

# Network deployment (HTTP/SSE)
python memory-system-mcp-server.py --http --port 8200
```

### 5.6 SSE (Server-Sent Events) Transport

SSE is a one-way communication channel where the server can push events to the client. For MCP:

```
Client (AI Assistant)                Server (MCP Memory)
        │                                    │
        │  GET /sse                          │
        │ ─────────────────────────────────► │
        │                                    │
        │  HTTP 200, Content-Type: text/event-stream
        │ ◄───────────────────────────────── │
        │                                    │
        │  event: message                    │
        │  data: {"jsonrpc":"2.0",...}       │
        │ ◄───────────────────────────────── │
        │                                    │
        │  (Connection stays open)           │
        │  data: {"jsonrpc":"2.0",...}       │
        │ ◄───────────────────────────────── │
```

---

## 6. Complete API Reference

### 6.1 MCP Tool: `store_memory`

**Purpose:** Save a new memory entry to the system.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| domain | string | Yes | - | One of: bmad_code, website_info, religious_discussions, electronics_maker |
| content_data | dict | Yes | - | The actual memory content |
| source | string | Yes | - | Where this memory came from (e.g., "claude-code-session") |
| content_type | string | No | "conversation" | Type of content |
| subdomain | string | No | null | Optional sub-category |
| tags | list[string] | No | [] | Searchable tags |
| confidence | float | No | 1.0 | Reliability score (0.0-1.0) |

**Example Call:**
```json
{
    "tool": "store_memory",
    "arguments": {
        "domain": "bmad_code",
        "content_data": {
            "code_snippet": "def greet(name):\n    return f'Hello, {name}!'",
            "conversation_context": "User asked about Python functions",
            "project_id": "tutorial_project"
        },
        "source": "claude-code-session-001",
        "tags": ["python", "functions", "greeting"],
        "confidence": 0.95
    }
}
```

**Response:**
```json
{
    "status": "success",
    "memory_id": "94b4f4ae-40f8-446a-8317-32f3137fb0a1",
    "message": "Memory stored successfully in bmad_code domain"
}
```

**Internal Flow:**
```
1. store_memory called
   ↓
2. MemoryManager.store_conversation()
   ├── Validate domain exists
   ├── Run domain-specific validator
   ├── Generate UUID for memory_id
   └── Call ChromaDBStorage.store_memory()
       ├── Generate embedding from content
       ├── Prepare document and metadata
       └── POST to /api/v1/collections/{id}/add
```

---

### 6.2 MCP Tool: `retrieve_memories`

**Purpose:** Search and retrieve stored memories with filters.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| domain | string | No | null | Filter by domain |
| content_type | string | No | null | Filter by content type |
| tags | list[string] | No | null | Filter by tags (OR logic) |
| source | string | No | null | Filter by source |
| keyword | string | No | null | Search by keyword (semantic search) |
| limit | int | No | 100 | Maximum results |
| offset | int | No | 0 | Pagination offset |

**Example Call:**
```json
{
    "tool": "retrieve_memories",
    "arguments": {
        "domain": "bmad_code",
        "keyword": "Python function",
        "tags": ["python"],
        "limit": 10
    }
}
```

**Response:**
```json
{
    "memories": [
        {
            "id": "94b4f4ae-40f8-446a-8317-32f3137fb0a1",
            "domain": "bmad_code",
            "content_type": "conversation",
            "content_data": {
                "code_snippet": "def greet(name):\n    return f'Hello, {name}!'",
                "conversation_context": "User asked about Python functions"
            },
            "tags": ["python", "functions"],
            "timestamp": "2025-12-31T12:00:00",
            "source": "claude-code-session-001",
            "confidence": 0.95,
            "similarity_score": 0.85
        }
    ]
}
```

---

### 6.3 MCP Tool: `search_memories_advanced`

**Purpose:** Advanced search with multiple filters, exclusions, and confidence ranges.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| domain | string | No | null | Filter by domain |
| content_type | string | No | null | Filter by content type |
| tags | list[string] | No | null | Filter by tags |
| source | string | No | null | Filter by source |
| keywords | list[string] | No | null | Multiple search keywords (AND logic) |
| exclude_keywords | list[string] | No | null | Keywords to exclude |
| min_confidence | float | No | 0.0 | Minimum confidence score |
| max_confidence | float | No | 1.0 | Maximum confidence score |
| limit | int | No | 100 | Maximum results |

**Example Call:**
```json
{
    "tool": "search_memories_advanced",
    "arguments": {
        "domain": "bmad_code",
        "keywords": ["python", "function"],
        "exclude_keywords": ["deprecated"],
        "min_confidence": 0.7,
        "limit": 20
    }
}
```

**Response:**
```json
{
    "status": "success",
    "memories": [...],
    "total_count": 45,
    "has_more": true
}
```

---

### 6.4 MCP Tool: `expand_keywords`

**Purpose:** Get related search terms for better memory retrieval.

**How it Works:**

```
User Query: "Arduino LED"
                ↓
expand_keywords analyzes:
├── Direct keyword matching
├── Domain-specific synonyms
├── Stemmed variations
└── Keywords from stored memories
                ↓
Expanded Keywords: [
    "arduino", "led", "electronics", "circuit",
    "microcontroller", "uno", "component", "sensor"
]
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| domain | string | Yes | - | Domain for expansion |
| user_query | string | Yes | - | The user's original query |
| max_keywords | int | No | 15 | Maximum keywords to return |

**Example Call:**
```json
{
    "tool": "expand_keywords",
    "arguments": {
        "domain": "electronics_maker",
        "user_query": "Arduino LED blink",
        "max_keywords": 10
    }
}
```

**Response:**
```json
{
    "status": "success",
    "keywords": [
        "arduino",
        "led",
        "blink",
        "electronics",
        "microcontroller",
        "circuit",
        "uno",
        "digital",
        "gpio",
        "output"
    ],
    "domain": "electronics_maker",
    "query": "Arduino LED blink"
}
```

**Internal Implementation:**
```python
def expand_keywords(self, domain: str, user_query: str, max_keywords: int = 15):
    # Strategy 1: Direct keyword matching
    # Match query words against domain keyword list

    # Strategy 2: Extract from stored memories
    # Find frequently used words in domain's memories

    # Strategy 3: Word stemming
    # "programming" → "program" → matches "programmer"

    # Strategy 4: Domain synonyms
    # "code" → ["programming", "development", "implementation"]

    # Combine, deduplicate, sort by relevance
    return all_keywords[:max_keywords]
```

---

### 6.5 MCP Tool: `get_memory_statistics`

**Purpose:** Get system statistics about stored memories.

**Parameters:** None

**Response:**
```json
{
    "status": "success",
    "statistics": {
        "total_memories": 1247,
        "domain_distribution": {
            "bmad_code": 823,
            "website_info": 234,
            "religious_discussions": 98,
            "electronics_maker": 92
        },
        "storage_backend": "chromadb",
        "chromadb_host": "192.168.68.69",
        "chromadb_port": 8001
    }
}
```

---

### 6.6 MCP Tool: `get_similar_memories`

**Purpose:** Find memories similar to a given memory ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| memory_id | string | Yes | - | Target memory ID |
| limit | int | No | 10 | Maximum similar memories |

**Similarity Scoring:**
```python
def _score_similarity(self, memories, target_memory):
    for memory in memories:
        score = 0.0

        # Same subdomain: +0.2
        if memory.subdomain == target_memory.subdomain:
            score += 0.2

        # Common tags: +0.1 per tag (max 0.3)
        common_tags = set(memory.tags) & set(target_memory.tags)
        score += min(len(common_tags) * 0.1, 0.3)

        # Within 24 hours: +0.2
        if time_difference < 24_hours:
            score += 0.2

        # Same content type: +0.1
        if memory.content_type == target_memory.content_type:
            score += 0.1

        # Same source: +0.2
        if memory.source == target_memory.source:
            score += 0.2

        memory.similarity_score = score
```

---

### 6.7 MCP Tool: `get_keyword_trends`

**Purpose:** Analyze keyword trends over time in a domain.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| domain | string | Yes | - | Domain to analyze |
| days | int | No | 30 | Number of days to analyze |

**Response:**
```json
{
    "status": "success",
    "trends": {
        "total_memories": 234,
        "top_keywords": ["python", "function", "class", "api", "database"],
        "keyword_frequency": {
            "python": 145,
            "function": 98,
            "class": 76,
            "api": 54,
            "database": 43
        },
        "diversity_score": 0.73,
        "unique_words": 1247,
        "average_words_per_memory": 128.5
    },
    "domain": "bmad_code",
    "days": 30
}
```

---

## 7. Domain System and Keyword Expansion

### 7.1 Understanding Domains

Domains are **categories** that organize memories by topic area. Each domain has:

1. **Its own ChromaDB collection** (separate storage)
2. **Validation rules** (what content is required)
3. **Keyword sets** (domain-specific vocabulary)
4. **Synonym mappings** (related terms)

### 7.2 Current Domains

#### Domain: `bmad_code`
**Purpose:** Programming, development, BMAD methodology

**Required Fields:**
- `code_snippet` - The actual code
- `conversation_context` - Discussion context
- `project_id` - Project identifier

**Keywords:**
```python
["code", "development", "implementation", "architecture", "design",
 "algorithm", "function", "class", "method", "variable", "project",
 "specification", "requirement", "testing", "debugging"]
```

**Synonyms:**
```python
{
    "code": ["programming", "development", "implementation", "coding"],
    "function": ["method", "procedure", "routine"],
    "class": ["object", "type", "structure"],
    "project": ["application", "system", "module"]
}
```

#### Domain: `website_info`
**Purpose:** Web content, URLs, online resources

**Recommended Fields:**
- `url` - The website URL
- `content_summary` - Summary of the content
- `website_metadata` - Title, author, etc.

**Keywords:**
```python
["website", "content", "article", "page", "url", "domain", "information",
 "data", "resource", "source", "citation", "online", "web", "internet",
 "platform", "service"]
```

#### Domain: `religious_discussions`
**Purpose:** Theological and spiritual topics

**Recommended Fields:**
- `discussion_topic` - The main topic
- `theological_context` - Background context
- `scripture_references` - Biblical references

**Keywords:**
```python
["theological", "spiritual", "religious", "faith", "belief", "doctrine",
 "scripture", "bible", "theology", "philosophy", "worship", "prayer",
 "spirituality", "divine", "sacred"]
```

#### Domain: `electronics_maker`
**Purpose:** Hardware, circuits, maker projects

**Recommended Fields:**
- `project_name` - Name of the project
- `technical_specs` - Voltage, current, etc.
- `components` - List of components used

**Keywords:**
```python
["electronics", "circuit", "component", "resistor", "capacitor",
 "microcontroller", "arduino", "raspberry", "sensor", "actuator",
 "maker", "diy", "project", "prototype", "engineering"]
```

### 7.3 The Keyword Expansion Algorithm

When a user searches with keywords, the system expands them to find more relevant results:

```python
def expand_keywords(self, domain: str, user_query: str, max_keywords: int = 15):
    """Expand user query with domain-specific keywords"""

    # Step 1: Get base domain keywords
    base_keywords = self._get_domain_keywords(domain)
    query_words = set(re.findall(r'\b\w+\b', user_query.lower()))

    # Step 2: Direct matching
    # Find domain keywords that contain query words
    direct_matches = []
    for keyword in base_keywords:
        if any(word in keyword.lower() for word in query_words):
            direct_matches.append(keyword)

    # Step 3: Extract from stored memories
    # Find words frequently used in the domain's memories
    memory_keywords = self._extract_keywords_from_memories(domain, query_words)

    # Step 4: Stemmed keywords
    # Match stemmed versions ("programming" → "program")
    stemmed_keywords = self._generate_stemmed_keywords(query_words, base_keywords)

    # Step 5: Synonyms
    # Get domain-specific synonyms
    synonym_keywords = self._get_synonym_keywords(query_words, domain)

    # Step 6: Combine and rank
    all_keywords = []
    seen = set()
    for kw_list in [direct_matches, memory_keywords, stemmed_keywords, synonym_keywords]:
        for kw in kw_list:
            if kw.lower() not in seen:
                all_keywords.append(kw)
                seen.add(kw.lower())

    # Sort by relevance score
    all_keywords.sort(key=lambda x: self._calculate_keyword_relevance(x, query_words, domain), reverse=True)

    return all_keywords[:max_keywords]
```

### 7.4 Relevance Scoring

Keywords are scored for relevance:

```python
def _calculate_keyword_relevance(self, keyword: str, query_words: set, domain: str) -> float:
    score = 0.0
    keyword_lower = keyword.lower()

    # Direct match with query: +0.5
    for word in query_words:
        if word in keyword_lower:
            score += 0.5

    # In domain keyword list: +0.3
    domain_keywords = self._get_domain_keywords(domain)
    if keyword_lower in [kw.lower() for kw in domain_keywords]:
        score += 0.3

    # Longer keywords (more specific): up to +0.2
    score += min(len(keyword) / 50, 0.2)

    return score
```

---

## 8. Adding New Domains

### 8.1 Step-by-Step Guide

Adding a new domain (e.g., `machine_learning`) requires changes in three files:

#### Step 1: Update `chromadb_storage.py`

```python
# In ChromaDBStorage.__init__(), add to domains list:
self.domains = [
    "bmad_code",
    "website_info",
    "religious_discussions",
    "electronics_maker",
    "machine_learning",  # NEW DOMAIN
]
```

#### Step 2: Update `multi_domain_memory_system.py`

```python
# In MemoryManager.__init__(), add validator:
self.domain_validators = {
    "bmad_code": self._validate_bmad_code,
    "website_info": self._validate_website_info,
    "religious_discussions": self._validate_religious_discussions,
    "electronics_maker": self._validate_electronics_maker,
    "machine_learning": self._validate_machine_learning,  # NEW
}

# Add the validator method:
def _validate_machine_learning(self, data: Dict[str, Any]):
    """Validate machine learning memory content"""
    # Define required fields
    required_fields = ["model_type", "framework", "description"]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field for machine_learning: {field}")

    # Validate model_type
    valid_types = ["classification", "regression", "clustering", "nlp", "vision", "reinforcement"]
    if data.get("model_type") not in valid_types:
        logger.warning(f"Unrecognized model type: {data.get('model_type')}")

    # Validate framework
    valid_frameworks = ["pytorch", "tensorflow", "scikit-learn", "keras", "jax", "huggingface"]
    if data.get("framework") not in valid_frameworks:
        logger.warning(f"Unrecognized framework: {data.get('framework')}")

    logger.info("Machine learning validation passed")
```

#### Step 3: Add Domain Keywords

```python
# In _get_domain_keywords(), add entry:
keyword_sets = {
    # ... existing domains ...
    "machine_learning": [
        "machine learning", "deep learning", "neural network",
        "model", "training", "inference", "dataset", "features",
        "accuracy", "loss", "optimizer", "epoch", "batch",
        "classification", "regression", "clustering", "embedding",
        "transformer", "cnn", "rnn", "lstm", "attention"
    ],
}
```

#### Step 4: Add Domain Synonyms

```python
# In _get_synonym_keywords(), add entry:
synonym_map = {
    # ... existing domains ...
    "machine_learning": {
        "model": ["network", "classifier", "predictor"],
        "training": ["learning", "fitting", "optimization"],
        "dataset": ["data", "samples", "examples"],
        "neural network": ["nn", "deep learning", "dnn"],
    },
}
```

### 8.2 Testing the New Domain

```python
# Test storing a memory:
from src.memory.multi_domain_memory_system import MemoryManager

manager = MemoryManager()

memory_id = manager.store_conversation(
    domain="machine_learning",
    conversation_data={
        "model_type": "classification",
        "framework": "pytorch",
        "description": "CNN for image classification",
        "architecture": "ResNet-50",
        "accuracy": 0.95
    },
    source="ml-project-001",
    tags=["cnn", "resnet", "image-classification"]
)

print(f"Stored: {memory_id}")

# Test retrieval:
memories = manager.retrieve_conversations(
    domain="machine_learning",
    keyword="classification"
)
print(f"Found {len(memories)} memories")
```

---

## 9. Creating New MCP Servers

### 9.1 Why Create a New MCP Server?

You might need a new MCP server if:
- Switching to a different AI coding assistant
- Adding entirely new capabilities
- Using a different database backend
- Creating a specialized memory subsystem

### 9.2 MCP Server Template

Here's a complete template for creating a new MCP server:

```python
#!/usr/bin/env python3
"""
Custom Memory System MCP Server
Replace this docstring with your server description.
"""

import sys
import os
import logging
from typing import Any, Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr,  # MCP uses stdout for protocol
)
logger = logging.getLogger(__name__)

# Import MCP SDK
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

# Configure transport security
transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=False,
    allowed_hosts=["*"],
    allowed_origins=["*"],
)

# Create MCP server
mcp = FastMCP(
    name="my-custom-server",
    instructions="""
    Custom Memory Server v1.0.0

    Available tools:
    - custom_store: Store custom data
    - custom_retrieve: Retrieve custom data
    """,
    transport_security=transport_security,
)

# ============================================
# YOUR CUSTOM BACKEND
# ============================================

class CustomBackend:
    """Replace with your actual backend implementation"""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.data = {}  # In-memory for demo

    def store(self, key: str, value: dict) -> str:
        import uuid
        id = str(uuid.uuid4())
        self.data[id] = {"key": key, "value": value}
        return id

    def retrieve(self, key: str) -> List[dict]:
        return [v for k, v in self.data.items() if v.get("key") == key]

# Initialize backend
backend = CustomBackend("your-connection-string")

# ============================================
# MCP TOOLS
# ============================================

@mcp.tool()
def custom_store(
    key: str,
    data: dict,
    tags: Optional[List[str]] = None,
) -> dict:
    """
    Store custom data in the backend.

    Args:
        key: Storage key/category
        data: Data to store
        tags: Optional tags

    Returns:
        Dictionary with status and ID
    """
    try:
        id = backend.store(key, {"data": data, "tags": tags or []})
        return {"status": "success", "id": id}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def custom_retrieve(
    key: str,
    limit: int = 100,
) -> dict:
    """
    Retrieve custom data from the backend.

    Args:
        key: Storage key/category
        limit: Maximum results

    Returns:
        Dictionary with results
    """
    try:
        results = backend.retrieve(key)[:limit]
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ============================================
# SERVER RUNNERS
# ============================================

def run_http_server(host: str = "0.0.0.0", port: int = 8300):
    """Run in HTTP/SSE mode"""
    import uvicorn
    logger.info(f"Starting server on http://{host}:{port}")
    app = mcp.sse_app()
    uvicorn.run(app, host=host, port=port)


def run_stdio_server():
    """Run in stdio mode"""
    logger.info("Starting server in stdio mode")
    mcp.run()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--http", action="store_true")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8300)
    args = parser.parse_args()

    if args.http:
        run_http_server(args.host, args.port)
    else:
        run_stdio_server()
```

### 9.3 Connecting to Different Databases

#### PostgreSQL Backend Example

```python
import psycopg2
from psycopg2.extras import RealDictCursor

class PostgresBackend:
    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)
        self._init_tables()

    def _init_tables(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    domain VARCHAR(50) NOT NULL,
                    content JSONB NOT NULL,
                    tags TEXT[],
                    created_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_domain ON memories(domain);
            """)
            self.conn.commit()

    def store(self, domain: str, content: dict, tags: list) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO memories (domain, content, tags)
                   VALUES (%s, %s, %s) RETURNING id""",
                (domain, json.dumps(content), tags)
            )
            self.conn.commit()
            return str(cur.fetchone()[0])

    def search(self, domain: str, keyword: str, limit: int) -> list:
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM memories
                   WHERE domain = %s AND content::text ILIKE %s
                   ORDER BY created_at DESC LIMIT %s""",
                (domain, f"%{keyword}%", limit)
            )
            return cur.fetchall()
```

#### MongoDB Backend Example

```python
from pymongo import MongoClient

class MongoBackend:
    def __init__(self, uri: str, db_name: str = "memory_system"):
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.memories = self.db.memories
        # Create indexes
        self.memories.create_index("domain")
        self.memories.create_index([("content", "text")])

    def store(self, domain: str, content: dict, tags: list) -> str:
        result = self.memories.insert_one({
            "domain": domain,
            "content": content,
            "tags": tags,
            "created_at": datetime.utcnow()
        })
        return str(result.inserted_id)

    def search(self, domain: str, keyword: str, limit: int) -> list:
        return list(self.memories.find(
            {"domain": domain, "$text": {"$search": keyword}},
            limit=limit
        ).sort("created_at", -1))
```

### 9.4 Registering with AI Assistants

#### For OpenCode (.opencode/opencode.json)

```json
{
    "mcp": {
        "my-custom-server": {
            "type": "remote",
            "url": "http://192.168.68.71:8300/sse",
            "enabled": true
        }
    }
}
```

#### For Claude Code (~/.config/claude/config.json)

```json
{
    "mcpServers": {
        "my-custom-server": {
            "command": "python",
            "args": ["/path/to/my-custom-server.py"],
            "env": {}
        }
    }
}
```

---

## 10. Deployment and Operations

### 10.1 Docker Deployment

**Dockerfile:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ ./src/
COPY .opencode/mcp/memory-system-mcp-server.py ./

# Environment variables
ENV CHROMADB_HOST=192.168.68.69
ENV CHROMADB_PORT=8001
ENV PYTHONUNBUFFERED=1

# Run server
EXPOSE 8200
CMD ["python", "memory-system-mcp-server.py", "--http", "--port", "8200"]
```

**requirements.txt:**
```
mcp>=0.1.0
uvicorn>=0.20.0
```

**Build and Run:**
```bash
# Build
docker build -t mcp-memory-system:latest .

# Run
docker run -d \
    --name mcp-memory-system \
    --network host \
    -e CHROMADB_HOST=192.168.68.69 \
    -e CHROMADB_PORT=8001 \
    mcp-memory-system:latest
```

### 10.2 Health Checks

**MCP Server Health:**
```bash
curl -sI http://192.168.68.71:8200/sse
# Expected: HTTP/1.1 200 OK, Content-Type: text/event-stream
```

**ChromaDB Health:**
```bash
curl -s http://192.168.68.69:8001/api/v1/heartbeat
# Expected: {"nanosecond heartbeat": ...}
```

**Full System Test:**
```python
from src.memory.multi_domain_memory_system import MemoryManager

# This will fail fast if ChromaDB is unavailable
manager = MemoryManager()

# Store test memory
id = manager.store_conversation(
    domain="bmad_code",
    conversation_data={"test": True, "message": "Health check"},
    source="health-check"
)

# Retrieve it
memories = manager.retrieve_conversations(
    domain="bmad_code",
    keyword="health check"
)

assert len(memories) > 0, "Health check failed!"
print("Health check passed!")
```

### 10.3 Backup Procedures

ChromaDB data should be backed up regularly. The backup script in the cluster:

```bash
# From backup-clu.sh
ssh maxvamp@$CLU_IP "docker stop mcp-memory-system 2>/dev/null"
rsync -avz maxvamp@$CLU_IP:/opt/mcp-memory-system/data/ "$BACKUP_DIR/mcp-memory-system-data/"
ssh maxvamp@$CLU_IP "docker start mcp-memory-system"
```

---

## 11. Troubleshooting Guide

### 11.1 Common Issues

#### Issue: "ChromaDB connection failed"

**Symptoms:**
```
ConnectionError: ChromaDB connection failed...
ChromaDB is REQUIRED to prevent data loss.
```

**Solutions:**
1. Check ChromaDB is running:
   ```bash
   curl http://192.168.68.69:8001/api/v1/heartbeat
   ```

2. Check environment variables:
   ```bash
   echo $CHROMADB_HOST $CHROMADB_PORT
   ```

3. Check network connectivity:
   ```bash
   ping 192.168.68.69
   ```

4. For development only, enable fallback:
   ```python
   manager = MemoryManager(allow_fallback=True)  # NOT for production!
   ```

#### Issue: MCP server not responding

**Symptoms:**
- AI assistant can't connect
- SSE endpoint returns error

**Solutions:**
1. Check server is running:
   ```bash
   docker ps | grep mcp-memory
   ```

2. Check logs:
   ```bash
   docker logs mcp-memory-system
   ```

3. Test endpoint directly:
   ```bash
   curl -v http://192.168.68.71:8200/sse
   ```

4. Restart container:
   ```bash
   docker restart mcp-memory-system
   ```

#### Issue: Memories not being found

**Symptoms:**
- `retrieve_memories` returns empty
- Known memories aren't appearing

**Solutions:**
1. Check domain is correct:
   ```python
   # Domain must be exactly: bmad_code, website_info,
   # religious_discussions, or electronics_maker
   ```

2. Check collection exists:
   ```bash
   curl http://192.168.68.69:8001/api/v1/collections
   ```

3. Try broader search:
   ```python
   # Search all domains
   memories = manager.retrieve_conversations(keyword="your search term")
   ```

### 11.2 Logging

Enable debug logging:

```python
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

Check specific loggers:
```python
logging.getLogger("src.memory.multi_domain_memory_system").setLevel(logging.DEBUG)
logging.getLogger("src.memory.chromadb_storage").setLevel(logging.DEBUG)
```

### 11.3 Performance Tuning

**For large result sets:**
```python
# Use pagination
memories = manager.retrieve_conversations(
    domain="bmad_code",
    limit=50,
    offset=0
)
# Then: offset=50, offset=100, etc.
```

**For slow queries:**
- Reduce `limit`
- Add domain filter
- Use more specific keywords

---

## Appendix A: Quick Reference Card

### MCP Tools Summary

| Tool | Purpose | Required Params |
|------|---------|-----------------|
| `store_memory` | Save memory | domain, content_data, source |
| `retrieve_memories` | Search memories | (all optional) |
| `search_memories_advanced` | Advanced search | (all optional) |
| `expand_keywords` | Get related terms | domain, user_query |
| `get_memory_statistics` | System stats | (none) |
| `get_similar_memories` | Find similar | memory_id |
| `get_keyword_trends` | Trend analysis | domain |

### Domain Quick Reference

| Domain | Collection | Primary Use |
|--------|------------|-------------|
| `bmad_code` | memory_bmad_code | Programming, code |
| `website_info` | memory_website_info | Web content |
| `religious_discussions` | memory_religious_discussions | Theology |
| `electronics_maker` | memory_electronics_maker | Hardware |

### Key Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| MCP Server | `http://CLU:8200/sse` | AI tool connection |
| ChromaDB | `http://SARK:8001/api/v1/` | Vector database |
| Heartbeat | `/api/v1/heartbeat` | Health check |
| Collections | `/api/v1/collections` | List/create |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - standardized AI tool communication |
| **ChromaDB** | Vector database for semantic search |
| **Embedding** | Numerical vector representation of text |
| **SSE** | Server-Sent Events - one-way event streaming |
| **FastMCP** | Python SDK for building MCP servers |
| **Domain** | Category for organizing memories |
| **Vector Search** | Finding similar content by vector distance |
| **Semantic Search** | Finding related content by meaning |

---

*Document created December 31, 2025*
*Comprehensive Memory System - Engineering Documentation*

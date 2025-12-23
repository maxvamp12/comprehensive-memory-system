# Memory System Integration Points

## Current Infrastructure Analysis

### Existing Services Available for Integration

#### 1. ChromaDB Vector Database (SARK)

**Location**: SARK server (192.168.68.69)
**Port**: 8001 (external)
**Endpoint**: `http://192.168.68.69:8001` or `http://192.168.100.10:8001`

**Current Configuration**:
```json
{
  "image": "chromadb/chroma:0.5.23",
  "data_path": "/home/maxvamp/chromadb-data",
  "auth": "admin:admin",
  "workers": 1
}
```

**Integration Approach**:
- Use existing ChromaDB instance for vector storage
- Connect memory system to port 8001
- Leverage existing data in `/home/maxvamp/chromadb-data`

#### 2. vLLM Distributed Inference Cluster

**Head Node**: SARK (192.168.101.10)
**Worker Node**: CLU (192.168.101.11)
**Model**: GLM-4.5-Air-AWQ

**API Endpoints**:
- OpenAI-compatible API available via vLLM
- TRT-LLM proxy: CLU:8366 -> SARK:9355

**Integration Approach**:
- Use vLLM for embedding generation (if supported)
- Use for LLM-based memory processing
- Connect via OpenAI-compatible API

#### 3. Existing Memory System (CLU)

**Location**: CLU server (192.168.68.71)
**Container**: memory-system (node:18-alpine)
**Port**: 3000

**Integration Approach**:
- Integrate with or replace existing memory-system container
- Maintain port 3000 for backward compatibility
- Leverage existing Node.js infrastructure

### Network Integration Points

#### Available Networks

| Network | Type | Access From | Best For |
|---------|------|-------------|----------|
| 192.168.68.x | LAN | External | User-facing APIs |
| 192.168.100.x | Swarm | Internal | Service discovery |
| 192.168.101.x | CONNECT-X | Internal | High-bandwidth data |
| Docker bridge | Container | Containers | Inter-container |

#### Recommended Network Strategy

1. **User API Access**: Expose on 192.168.68.x (LAN)
2. **ChromaDB Communication**: Use 192.168.100.10:8001 (Swarm network)
3. **vLLM Communication**: Use 192.168.101.x (CONNECT-X for performance)
4. **Container-to-Container**: Use Docker networking

### Docker Integration

#### Docker Swarm Services

Currently no Swarm services defined. Options:

1. **Deploy as Swarm Service**:
   - Automatic load balancing
   - Rolling updates
   - Service discovery via DNS

2. **Deploy as Standalone Containers**:
   - Simpler management
   - Direct port mapping
   - Current approach for vLLM/ChromaDB

#### Recommended Docker Configuration

```yaml
# docker-compose.yml for Memory System
version: '3.8'

services:
  memory-system:
    image: comprehensive-memory-system:latest
    ports:
      - "3000:3000"
    environment:
      - CHROMADB_HOST=192.168.100.10
      - CHROMADB_PORT=8001
      - VLLM_HOST=192.168.101.10
      - VLLM_PORT=8000
    networks:
      - bridge
    restart: unless-stopped
    runtime: nvidia
```

### Storage Integration Points

#### Available Storage Locations

| Server | Path | Size Available | Purpose |
|--------|------|----------------|---------|
| SARK | /home/maxvamp | 1.7 TB | User data |
| SARK | /mnt/borg-backup | 2.4 TB | Backup storage |
| CLU | /home/maxvamp | 2.2 TB | User data |

#### Data Persistence Strategy

1. **Memory Data**: Store in `/home/maxvamp/memory-system-data`
2. **Vector Embeddings**: Use existing ChromaDB at `/home/maxvamp/chromadb-data`
3. **Backups**: Leverage borg-backup-server on SARK

### API Integration Matrix

| Source | Target | Protocol | Port | Purpose |
|--------|--------|----------|------|---------|
| Memory System | ChromaDB | HTTP | 8001 | Vector storage |
| Memory System | vLLM | HTTP | 8000 | Embeddings/LLM |
| Open WebUI | Memory System | HTTP | 3000 | User queries |
| External | Memory System | HTTP | 3000 | API access |

## Integration Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │                  LAN Network                     │
                    │              192.168.68.0/24                     │
                    └─────────────────────────────────────────────────┘
                              │                        │
                    ┌─────────┴─────────┐    ┌───────┴────────┐
                    │   SARK (.69)      │    │   CLU (.71)    │
                    │                   │    │                │
                    │ ┌───────────────┐ │    │ ┌────────────┐ │
                    │ │   ChromaDB    │ │    │ │  Memory    │ │
                    │ │   :8001       │◄├────┼─┤  System    │ │
                    │ └───────────────┘ │    │ │  :3000     │ │
                    │                   │    │ └────────────┘ │
                    │ ┌───────────────┐ │    │                │
                    │ │  Open WebUI   │ │    │                │
                    │ │   :3000       │ │    │                │
                    │ └───────────────┘ │    │                │
                    │                   │    │                │
                    │ ┌───────────────┐ │    │ ┌────────────┐ │
                    │ │  vLLM Head    │◄├────┼►│ vLLM Worker│ │
                    │ │  :8000        │ │    │ │            │ │
                    │ └───────────────┘ │    │ └────────────┘ │
                    │                   │    │                │
                    │   Swarm: .100.10  │    │  Swarm: .100.11│
                    │   NCCL: .101.10   │    │  NCCL: .101.11 │
                    └───────────────────┘    └────────────────┘
                              │                        │
                    ┌─────────┴────────────────────────┴─────────┐
                    │            CONNECT-X Network                │
                    │              192.168.101.0/24               │
                    │         (High-speed GPU interconnect)       │
                    └─────────────────────────────────────────────┘
```

## Recommended Integration Steps

### Phase 1: Basic Integration

1. Configure memory system to connect to ChromaDB at 192.168.100.10:8001
2. Deploy memory system container on CLU (replace or update existing)
3. Expose memory system API on port 3000
4. Test basic vector storage and retrieval

### Phase 2: vLLM Integration

1. Configure memory system to use vLLM for embeddings
2. Set up vLLM API endpoint (192.168.101.10:8000)
3. Implement embedding generation pipeline
4. Test end-to-end memory storage with embeddings

### Phase 3: Web UI Integration

1. Connect Open WebUI to memory system
2. Add memory-aware prompting
3. Implement context injection from memory
4. Test user-facing memory features

### Phase 4: Advanced Features

1. Implement distributed memory across both servers
2. Set up memory replication/sync
3. Configure backup integration with borg-backup-server
4. Performance optimization using CONNECT-X network

## Compatibility Notes

### Software Versions

| Component | Current Version | Notes |
|-----------|-----------------|-------|
| Docker | 28.5.1 | Latest stable |
| ChromaDB | 0.5.23 | Check API compatibility |
| vLLM | 0.11.0 | OpenAI-compatible API |
| Node.js | 18 (Alpine) | Existing memory system |
| CUDA | 13.0 | Full GPU support |

### Potential Conflicts

1. **Port 3000**: Used by both Open WebUI (SARK) and memory-system (CLU)
   - Resolution: Different servers, no conflict

2. **Memory Pressure**: High RAM usage on both servers
   - Resolution: Monitor and optimize container memory limits

3. **GPU Memory**: Nearly full GPU utilization
   - Resolution: Share GPU carefully, use embeddings efficiently

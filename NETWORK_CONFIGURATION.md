# DGX SPARK Cluster Network Configuration Documentation

## System Overview

This document details the network configuration for a 2-server DGX SPARK cluster (SARK and CLU) running vLLM11 in Docker Swarm with comprehensive memory system integration.

---

## Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL NETWORK                          │
│                        (192.168.68.x - WiFi)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ WiFi Access
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             SARK (192.168.68.69)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   WiFi          │  │ Private Net 1  │  │ Private Net 2  │     │
│  │ 192.168.68.69   │  │192.168.100.10  │  │192.168.101.10  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                   │                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     SERVICES                                │   │
│  │  • vLLM Server (Docker Swarm)                                │   │
│  │  • ChromaDB (192.168.68.69:8001)                            │   │
│  │  • BORG-BACKUP Container                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ High-Speed Private Networks
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             CLU (192.168.68.71)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   WiFi          │  │ Private Net 1  │  │ Private Net 2  │     │
│  │ 192.168.68.71   │  │192.168.100.11  │  │192.168.101.11  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                   │                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     SERVICES                                │   │
│  │  • vLLM Server (Docker Swarm)                                │   │
│  │  • Comprehensive Memory System (192.168.100.11:3000)         │   │
│  │  • Data persisted to /opt/memory-system/data                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## IP Address Assignments

### **SARK Server**
| Interface | Network | IP Address | Purpose |
|-----------|---------|------------|---------|
| **WiFi** | Management | 192.168.68.69 | Primary management, ChromaDB, backup system |
| **Private Network 1** | SARK-CLU | 192.168.100.10 | High-speed data transfer to CLU |
| **Private Network 2** | SARK-CLU | 192.168.101.10 | Redundant high-speed connection to CLU |

### **CLU Server**
| Interface | Network | IP Address | Purpose |
|-----------|---------|------------|---------|
| **WiFi** | Management | 192.168.68.71 | Memory system API, client access |
| **Private Network 1** | SARK-CLU | 192.168.100.11 | High-speed data transfer from SARK |
| **Private Network 2** | SARK-CLU | 192.168.101.11 | Redundant high-speed connection from SARK |

---

## Service Endpoints

### **ChromaDB Service (SARK)**
- **Host**: 192.168.68.69
- **Port**: 8001
- **Collection**: memories
- **Authentication**: admin/admin
- **Purpose**: Vector database for semantic search

### **Memory System API (CLU)**
- **Host**: 192.168.100.11 (Private Network)
- **Port**: 3000
- **WiFi Access**: 192.168.68.71 (via NAT/load balancer)
- **Endpoints**:
  - Health: `http://192.168.100.11:3000/health`
  - Memory API: `http://192.168.100.11:3000/api/memories`
  - Search API: `http://192.168.100.11:3000/api/search`
  - OpenAI Compatible: `http://192.168.100.11:3000/api/v1/chat/completions`

### **External Access (WiFi)**
- **ChromaDB Management**: `http://192.168.68.69:8001`
- **Memory System Client**: `http://192.168.68.71:3000` (NAT to 192.168.100.11)

---

## Network Segregation

### **WiFi Network (192.168.68.x)**
- **Access Level**: Management & Client Access
- **Allowed Traffic**:
  - ✅ API endpoints for client tools (Cursor, Opencode, etc.)
  - ✅ Health checks and monitoring
  - ✅ User access and testing
  - ✅ ChromaDB management operations
- **Security**: Standard WiFi security, accessible from external network

### **Private Network (192.168.100.x & 192.168.101.x)**
- **Access Level**: High-speed data transfer only
- **Allowed Traffic**:
  - ✅ SARK to CLU backup data transfer
  - ✅ High-speed memory system operations
  - ✅ Internal system communication
- **Security**: Isolated network, NOT accessible from external WiFi

---

## Docker Swarm Configuration

### **SARK Services**
```yaml
# ChromaDB Service
services:
  chromadb:
    image: chromadb/chroma
    ports:
      - "8001:8000"
    volumes:
      - chromadb_data:/chroma
    networks:
      - management-net
      - private-net

# BORG-BACKUP Service
services:
  borg-backup:
    image: borgbackup/borg
    volumes:
      - backup_data:/backup
    networks:
      - private-net
```

### **CLU Services**
```yaml
# Memory System Service
services:
  memory-system:
    image: memory-system:latest
    ports:
      - "3000:3000"
    volumes:
      - /opt/memory-system/data:/app/data
    networks:
      - private-net
      - management-net
    environment:
      - CHROMA_HOST=192.168.68.69
      - CHROMA_PORT=8001
```

---

## Data Persistence

### **CLU Storage**
- **Path**: `/opt/memory-system/data`
- **Contents**: Memories, embeddings, indexes, logs
- **Backup**: Mounted from SARK via SSHFS on private network
- **Persistence**: Docker volume mounted to host filesystem

### **SARK Storage**
- **ChromaDB Data**: `/mnt/chromadb-data`
- **BORG Repository**: `/mnt/borg-backup/borg-repo`
- **Backup Scripts**: `/home/maxvamp/borg-docker/`

---

## Backup Integration

### **Network Requirements for Backup**
1. **SARK to CLU Mount**:
   - **Source**: `ssh maxvamp@192.168.100.11:/opt/memory-system`
   - **Destination**: `/backup-source/opt/memory-system` (in backup container)
   - **Network**: 192.168.100.x (high-speed private only)
   - **Protocol**: SSHFS read-only mount

2. **BORG Backup Execution**:
   - **Repository**: `/mnt/borg-backup/borg-repo` (on SARK)
   - **Network**: Local to SARK (no network dependency during backup)

---

## Security Configuration

### **Network Access Control**
```bash
# Firewall Rules (SARK)
sudo iptables -A INPUT -p tcp -s 192.168.68.0/24 --dport 8001 -j ACCEPT  # ChromaDB WiFi
sudo iptables -A INPUT -p tcp -s 192.168.100.0/24 --dport 3000 -j ACCEPT  # Memory System Private
sudo iptables -A INPUT -p tcp -s 192.168.101.0/24 --dport 3000 -j ACCEPT  # Memory System Private

# Block external access to private networks
sudo iptables -A INPUT -i !lo -p tcp -s 192.168.100.0/24 -j DROP
sudo iptables -A INPUT -i !lo -p tcp -s 192.168.101.0/24 -j DROP
```

### **SSH Configuration**
```bash
# Passwordless SSH between SARK and CLU
ssh-copy-id maxvamp@192.168.100.11
ssh-copy-id maxvamp@192.168.101.11
```

---

## Client Configuration

### **AI Tools Configuration**
```json
{
  "memory_system": {
    "api_base_url": "http://192.168.68.71:3000",
    "api_endpoints": {
      "health": "http://192.168.68.71:3000/health",
      "memories": "http://192.168.68.71:3000/api/memories",
      "search": "http://192.168.68.71:3000/api/search",
      "openai": "http://192.168.68.71:3000/api/v1/chat/completions"
    },
    "chroma_config": {
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

---

## Network Testing Commands

### **Connectivity Verification**
```bash
# Test WiFi network access
ping 192.168.68.69    # SARK
ping 192.168.68.71    # CLU

# Test private network access (SARK to CLU)
ping 192.168.100.11   # CLU via private network 1
ping 192.168.101.11   # CLU via private network 2

# Test SSH access
ssh maxvamp@192.168.100.11 "echo 'Private network access'"
```

### **Service Health Checks**
```bash
# ChromaDB health check
curl -u admin:admin http://192.168.68.69:8001/api/v1/heartbeat

# Memory system health check
curl http://192.168.68.71:3000/health
curl http://192.168.100.11:3000/health

# Memory creation test
curl -X POST http://192.168.68.71:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "categories": ["test"]}'
```

---

## Performance Optimization

### **Network Configuration**
1. **MTU Settings**: Set to 9000 for Jumbo frames on private networks
2. **TCP Tuning**: Enable BBR congestion control
3. **Load Balancing**: Use both private networks for redundancy

### **Docker Network Optimization**
```bash
# Create optimized networks
docker network create --opt com.docker.network.driver.mtu=9000 private-net-1
docker network create --opt com.docker.network.driver.mtu=9000 private-net-2
```

---

## Troubleshooting

### **Common Issues**
1. **Network Connectivity**: Verify private network interfaces are up
2. **Firewall Rules**: Check iptables rules on both servers
3. **Docker Networks**: Ensure containers are connected to correct networks
4. **SSH Access**: Verify passwordless SSH configuration

### **Debug Commands**
```bash
# Check network interfaces
ip addr show
netstat -i

# Check Docker networks
docker network ls
docker network inspect network_name

# Check container connectivity
docker exec -it container_name ping 192.168.68.69
```

---

## Last Updated
- **Date**: 2025-12-17
- **Status**: Production Configuration
- **Next Review**: Network performance optimization

---

*This configuration ensures secure, high-performance operation of the DGX SPARK cluster with proper network segregation and redundancy.*
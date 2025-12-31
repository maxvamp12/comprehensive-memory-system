# Resource Allocation Matrix

## Executive Summary

This resource allocation matrix provides a comprehensive breakdown of system resources required for the enhanced RAG system deployment across the SARK and CLU DGX servers. The allocation ensures optimal performance, scalability, and resource utilization while maintaining system stability and redundancy.

## Resource Allocation Overview

### System Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                      SARK Server (192.168.68.69)                   │
│                      Docker Swarm Manager                          │
│                     Primary Service Node                          │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      CLU Server (192.168.68.71)                   │
│                      Docker Swarm Worker                          │
│                     Secondary Service Node                          │
└─────────────────────────────────────────────────────────────────┘
```

## Server Resource Allocation

### SARK Server (192.168.68.69) - Primary Node

#### Hardware Resources
| Resource | Total Available | Allocated | Available | Utilization |
|----------|-----------------|-----------|-----------|-------------|
| **CPU** | 20 cores (10+10 big.LITTLE) | 12 cores | 8 cores | 60% |
| **Memory** | 119.7 GiB | 80 GiB | 39.7 GiB | 67% |
| **GPU** | NVIDIA GB10 (97GB) | 97GB | 0GB | 100% |
| **Storage** | 3.7TB NVMe | 2.0TB | 1.7TB | 54% |

#### Service Allocation
| Service | CPU Cores | Memory | GPU | Storage | Network | Priority |
|---------|------------|---------|-----|---------|---------|----------|
| **ChromaDB** | 2 cores | 4 GiB | 0GB | 500GB | LAN | High |
| **vLLM Head** | 8 cores | 64 GiB | 97GB | 100GB | CONNECT-X | Critical |
| **API Gateway** | 2 cores | 8 GiB | 0GB | 50GB | LAN | High |
| **Monitoring Stack** | 2 cores | 8 GiB | 0GB | 100GB | LAN | Medium |
| **Backup Service** | 0 cores | 4 GiB | 0GB | 1.25TB | LAN | Low |
| **Total Allocated** | **14 cores** | **88 GiB** | **97GB** | **2.0TB** | - | - |

#### Network Allocation
| Network Interface | Bandwidth | Usage | Protocol | Services |
|------------------|-----------|-------|----------|----------|
| **enp1s0f0** (LAN) | 10Gbps | 30% | TCP/UDP | User Access, API Gateway |
| **enp1s0f0np0** (CONNECT-X) | 100Gbps | 90% | RDMA | vLLM Communication |
| **docker0** (Bridge) | 10Gbps | 20% | TCP | Internal Service Communication |
| **overlay** (Swarm) | 10Gbps | 15% | TCP | Swarm Management |

#### Storage Allocation
| Mount Point | Size | Used | Available | Usage | Services |
|-------------|------|------|-----------|-------|-----------|
| **/** (NVMe) | 3.7TB | 1.9TB | 1.7TB | 54% | System, Services |
| **/data/chroma** | 500GB | 100GB | 400GB | 20% | ChromaDB |
| **/data/models** | 100GB | 80GB | 20GB | 80% | vLLM Models |
| **/data/memory** | 500GB | 50GB | 450GB | 10% | Memory Service |
| **/mnt/borg-backup** | 3.6TB | 1.0TB | 2.4TB | 30% | Backup Storage |

### CLU Server (192.168.68.71) - Secondary Node

#### Hardware Resources
| Resource | Total Available | Allocated | Available | Utilization |
|----------|-----------------|-----------|-----------|-------------|
| **CPU** | 20 cores (10+10 big.LITTLE) | 8 cores | 12 cores | 40% |
| **Memory** | 119.7 GiB | 64 GiB | 55.7 GiB | 53% |
| **GPU** | NVIDIA GB10 (97GB) | 97GB | 0GB | 100% |
| **Storage** | 3.7TB NVMe | 1.3TB | 2.2TB | 37% |

#### Service Allocation
| Service | CPU Cores | Memory | GPU | Storage | Network | Priority |
|---------|------------|---------|-----|---------|---------|----------|
| **Memory Service** | 4 cores | 32 GiB | 0GB | 1.0TB | LAN | Critical |
| **vLLM Worker** | 4 cores | 32 GiB | 97GB | 100GB | CONNECT-X | Critical |
| **Load Balancer** | 2 cores | 4 GiB | 0GB | 50GB | LAN | High |
| **Monitoring Agent** | 0 cores | 2 GiB | 0GB | 50GB | LAN | Medium |
| **Total Allocated** | **10 cores** | **70 GiB** | **97GB** | **1.3TB** | - | - |

#### Network Allocation
| Network Interface | Bandwidth | Usage | Protocol | Services |
|------------------|-----------|-------|----------|----------|
| **enp1s0f0** (LAN) | 10Gbps | 25% | TCP/UDP | User Access, Services |
| **enp1s0f0np0** (CONNECT-X) | 100Gbps | 85% | RDMA | vLLM Communication |
| **docker0** (Bridge) | 10Gbps | 15% | TCP | Internal Service Communication |
| **overlay** (Swarm) | 10Gbps | 10% | TCP | Swarm Management |

#### Storage Allocation
| Mount Point | Size | Used | Available | Usage | Services |
|-------------|------|------|-----------|-------|-----------|
| **/** (NVMe) | 3.7TB | 1.3TB | 2.2TB | 37% | System, Services |
| **/data/chroma** | 500GB | 0GB | 500GB | 0% | Future ChromaDB Replica |
| **/data/models** | 100GB | 80GB | 20GB | 80% | vLLM Models (Read-Only) |
| **/data/memory** | 1.0TB | 200GB | 800GB | 20% | Memory Service |
| **/mnt/borg-backup** | 3.6TB | 0GB | 3.6TB | 0% | Future Backup Storage |

## Container Resource Allocation

### Docker Container Resources

#### SARK Server Containers
| Container | Image | CPU | Memory | GPU | Network | Ports | Health |
|-----------|-------|-----|--------|-----|---------|-------|--------|
| **chromadb** | chromadb/chroma:0.5.23 | 2 cores | 4 GiB | 0GB | bridge | 8001:8000 | Healthy |
| **vllm-head** | nvcr.io/nvidia/vllm:25.11 | 8 cores | 64 GiB | 97GB | host | 8000 | Healthy |
| **nginx-gateway** | nginx:alpine | 2 cores | 8 GiB | 0GB | bridge | 80:80, 443:443 | Healthy |
| **prometheus** | prom/prometheus:latest | 2 cores | 8 GiB | 0GB | bridge | 9090:9090 | Healthy |
| **grafana** | grafana/grafana:latest | 0 cores | 4 GiB | 0GB | bridge | 3000:3000 | Healthy |
| **borg-backup** | borg-docker-borg-server | 0 cores | 4 GiB | 0GB | bridge | 2222:22 | Healthy |

#### CLU Server Containers
| Container | Image | CPU | Memory | GPU | Network | Ports | Health |
|-----------|-------|-----|--------|-----|---------|-------|--------|
| **memory-service** | node:18-alpine | 4 cores | 32 GiB | 0GB | bridge | 3000:3000 | Healthy |
| **vllm-worker** | nvcr.io/nvidia/vllm:25.11 | 4 cores | 32 GiB | 97GB | bridge | - | Healthy |
| **haproxy-lb** | haproxy:alpine | 2 cores | 4 GiB | 0GB | bridge | 80:80 | Healthy |
| **node-exporter** | prom/node-exporter:latest | 0 cores | 2 GiB | 0GB | bridge | 9100:9100 | Healthy |
| **cadvisor** | google/cadvisor:latest | 0 cores | 2 GiB | 0GB | bridge | 8080:8080 | Healthy |

## Network Resource Allocation

### Network Bandwidth Allocation
| Network | Bandwidth | Allocated | Available | Utilization | Services |
|---------|-----------|-----------|-----------|-------------|----------|
| **LAN (192.168.68.x)** | 10Gbps | 3Gbps | 7Gbps | 30% | User Access, API Gateway |
| **Swarm (192.168.100.x)** | 10Gbps | 1.5Gbps | 8.5Gbps | 15% | Swarm Management |
| **CONNECT-X (192.168.101.x)** | 100Gbps | 85Gbps | 15Gbps | 85% | vLLM Communication |
| **Bridge (172.17.0.x)** | 10Gbps | 2Gbps | 8Gbps | 20% | Internal Services |

### Network Service Allocation
| Service | Protocol | Port | Bandwidth | Priority | QoS |
|---------|----------|------|-----------|----------|-----|
| **vLLM Communication** | RDMA | - | 85Gbps | Critical | Highest |
| **API Gateway** | HTTP/HTTPS | 80/443 | 1Gbps | High | Medium |
| **ChromaDB** | HTTP | 8001 | 500Mbps | High | Medium |
| **Memory Service** | HTTP | 3000 | 500Mbps | Critical | High |
| **Monitoring** | HTTP | 9090/3000 | 100Mbps | Medium | Low |

## Storage Resource Allocation

### Storage Performance Allocation
| Storage Type | IOPS | Throughput | Latency | Services | Utilization |
|--------------|------|------------|---------|----------|-------------|
| **NVMe (System)** | 100,000 | 3GB/s | <0.1ms | System, Services | 50% |
| **NVMe (ChromaDB)** | 80,000 | 2GB/s | <0.5ms | ChromaDB | 20% |
| **NVMe (Models)** | 60,000 | 1.5GB/s | <0.3ms | vLLM Models | 80% |
| **NVMe (Memory)** | 70,000 | 1.8GB/s | <0.4ms | Memory Service | 10% |
| **HDD (Backup)** | 200 | 150MB/s | <5ms | Backup Service | 30% |

### Storage Growth Projections
| Storage | Current | Year 1 | Year 2 | Year 3 | Growth Rate |
|---------|---------|--------|--------|--------|-------------|
| **System Storage** | 1.9TB | 2.3TB | 2.7TB | 3.1TB | 20% annually |
| **ChromaDB Storage** | 100GB | 120GB | 144GB | 173GB | 20% annually |
| **Model Storage** | 80GB | 96GB | 115GB | 138GB | 20% annually |
| **Memory Storage** | 250GB | 300GB | 360GB | 432GB | 20% annually |
| **Backup Storage** | 1.0TB | 1.2TB | 1.44TB | 1.73TB | 20% annually |

## Resource Monitoring and Alerting

### Resource Alert Thresholds
| Resource | Warning | Critical | Action |
|----------|---------|----------|--------|
| **CPU Utilization** | >80% | >95% | Scale services, optimize usage |
| **Memory Utilization** | >85% | >95% | Add memory, optimize services |
| **GPU Utilization** | >90% | >98% | Scale models, optimize inference |
| **Storage Utilization** | >80% | >95% | Add storage, archive data |
| **Network Bandwidth** | >70% | >90% | Optimize traffic, add bandwidth |

### Resource Scaling Strategy
| Service | Horizontal Scaling | Vertical Scaling | Auto-scaling |
|---------|-------------------|-----------------|--------------|
| **ChromaDB** | Yes | No | Yes (based on query load) |
| **vLLM Cluster** | Yes | No | Yes (based on GPU utilization) |
| **Memory Service** | Yes | No | Yes (based on memory usage) |
| **API Gateway** | Yes | No | Yes (based on request rate) |
| **Monitoring** | No | Yes | No |

## Resource Optimization Strategies

### CPU Optimization
- **Big.LITTLE Utilization**: Distribute CPU-intensive tasks to Cortex-X925 cores
- **CPU Pinning**: Pin critical services to specific cores for performance
- **Load Balancing**: Distribute workload evenly across available cores

### Memory Optimization
- **Memory Overcommitment**: Enable memory overcommitment for better resource utilization
- **Cache Tuning**: Optimize filesystem cache for better I/O performance
- **Memory Limits**: Set appropriate memory limits for each service

### GPU Optimization
- **GPU Partitioning**: Partition GPU resources for multi-service utilization
- **Memory Management**: Optimize GPU memory usage for model inference
- **CUDA Optimization**: Optimize CUDA kernels for better performance

### Storage Optimization
- **Container Storage**: Use Docker volumes for portable storage
- **Filesystem Optimization**: Optimize filesystem parameters for NVMe
- **Backup Strategy**: Implement automated backups with Borg

## Disaster Recovery Resource Allocation

### High Availability Resources
| Service | Primary Node | Secondary Node | Failover Time | Data Replication |
|---------|-------------|---------------|---------------|------------------|
| **ChromaDB** | SARK | CLU | <30s | Async replication |
| **Memory Service** | CLU | SARK | <30s | Async replication |
| **vLLM Cluster** | Distributed | N/A | <5s | N/A |
| **API Gateway** | SARK | CLU | <10s | Load balancing |

### Backup Resource Allocation
| Backup Type | Frequency | Retention | Storage Location | Resource Impact |
|-------------|-----------|-----------|-----------------|----------------|
| **Daily Full** | Daily | 7 days | External Storage | Low |
| **Hourly Incremental** | Hourly | 24 hours | External Storage | Minimal |
| **Weekly Full** | Weekly | 4 weeks | External Storage | Low |
| **Monthly Full** | Monthly | 6 months | External Storage | Low |

## Resource Allocation Success Criteria

### Performance Metrics
- **CPU Utilization**: <80% sustained, <95% peak
- **Memory Utilization**: <85% sustained, <95% peak
- **GPU Utilization**: <90% sustained, <98% peak
- **Storage Utilization**: <80% sustained, <95% peak
- **Network Utilization**: <70% sustained, <90% peak

### Reliability Metrics
- **Service Availability**: >99.9% uptime
- **Failover Time**: <30 seconds for critical services
- **Data Recovery Time**: <1 hour for data restoration
- **Backup Success Rate**: >99.9% success rate

### Scalability Metrics
- **Horizontal Scaling**: Auto-scale based on resource utilization
- **Vertical Scaling**: Dynamic resource allocation based on demand
- **Resource Efficiency**: >80% resource utilization efficiency
- **Growth Capacity**: 200% growth capacity within current hardware

## Resource Allocation Implementation Timeline

### Week 1: Resource Assessment
- [ ] Complete current resource inventory
- [ ] Document resource utilization patterns
- [ ] Identify resource bottlenecks
- [ ] Create resource allocation plan

### Week 2: Resource Configuration
- [ ] Configure container resource limits
- [ ] Set up resource monitoring
- [ ] Implement resource alerting
- [ ] Configure resource scaling policies

### Week 3: Resource Optimization
- [ ] Optimize CPU utilization
- [ ] Optimize memory allocation
- [ ] Optimize GPU usage
- [ ] Optimize storage performance

### Week 4: Resource Validation
- [ ] Validate resource allocation effectiveness
- [ ] Test resource scaling capabilities
- [ ] Validate disaster recovery resources
- [ ] Document resource allocation procedures

## Risk Assessment

### High Priority Risks
1. **Resource Contention**
   - **Mitigation**: Proper resource allocation and monitoring
   - **Owner**: Infrastructure Team

2. **Resource Exhaustion**
   - **Mitigation**: Auto-scaling and capacity planning
   - **Owner**: Operations Team

3. **Performance Degradation**
   - **Mitigation**: Resource optimization and monitoring
   - **Owner**: Performance Team

### Medium Priority Risks
1. **Resource Fragmentation**
   - **Mitigation**: Resource consolidation and optimization
   - **Owner**: Operations Team

2. **Resource Monitoring Overload**
   - **Mitigation**: Monitoring optimization and alerting
   - **Owner**: Monitoring Team

## Conclusion

This resource allocation matrix provides a comprehensive approach to resource management for the enhanced RAG system. The allocation ensures optimal performance, scalability, and reliability while maintaining system stability and disaster recovery capabilities.

The containerized approach allows for easy migration and scalability, while the monitoring and alerting systems provide comprehensive visibility into resource utilization and performance.

---
*Created: $(date)*
*Version: 1.0*
*Status: Draft*
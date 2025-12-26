# Storage Optimization Plan

## Executive Summary

This storage optimization plan addresses current storage utilization and provides a strategy for enhanced storage performance, redundancy, and scalability across the SARK and CLU DGX servers.

## Current Storage Analysis

### SARK Server (192.168.68.69)
- **Primary Storage**: 3.7TB NVMe (54% used = 1.9TB used, 1.7TB available)
- **Backup Storage**: 3.6TB external (30% used = 1.0TB used, 2.4TB available)
- **Borg Backup**: Active with 3.6TB external storage
- **ChromaDB Data**: `/home/maxvamp/chromadb-data` (host-mounted)

### CLU Server (192.168.68.71)
- **Primary Storage**: 3.7TB NVMe (37% used = 1.3TB used, 2.2TB available)
- **Memory Service Data**: Host-mounted volumes
- **vLLM Models**: `/home/maxvamp/GLM-4.5-Air-AWQ` (read-only)

## Storage Optimization Strategy

### Phase 1: Storage Assessment (Week 1)

#### 1.1 Current Storage Utilization Analysis
- **SARK**: 54% utilization (1.9TB/3.7TB)
- **CLU**: 37% utilization (1.3TB/3.7TB)
- **Growth Projection**: 20% annual growth expected
- **Capacity Planning**: 50% utilization threshold for expansion

#### 1.2 Storage Performance Metrics
- **IOPS**: Current baseline measurement required
- **Throughput**: Read/write performance analysis
- **Latency**: Access time optimization
- **Cache Efficiency**: Memory utilization optimization

### Phase 2: Containerized Storage Configuration (Week 2)

#### 2.1 Container Storage Strategy
**Container Volumes Configuration:**
```bash
# Create Docker volumes for containerized storage
docker volume create chroma-data
docker volume create memory-data
docker volume create vllm-models
docker volume create backup-data

# Configure persistent storage volumes
docker volume create --name chroma-persistent \
  --opt type=none \
  --opt device=/data/chroma \
  --opt o=bind

docker volume create --name memory-persistent \
  --opt type=none \
  --opt device=/data/memory \
  --opt o=bind
```

**Container Storage Optimizations:**
- **Bind Mounts**: Direct host volume mounts for performance
- **Docker Volumes**: Managed container volumes for portability
- **Storage Drivers**: Overlay2 for efficient storage utilization
- **Backup Integration**: Borg backup integration for all container volumes

#### 2.2 Container Network Storage
**Docker Swarm Storage Configuration:**
```yaml
# docker-compose.yml storage configuration
version: '3.8'
services:
  chromadb:
    volumes:
      - chroma-data:/chroma/data
      - /data/chroma:/chroma/data:ro
    networks:
      - optimized-swarm
      
  memory-service:
    volumes:
      - memory-data:/app/data
      - /data/memory:/app/data:ro
    networks:
      - optimized-swarm
      
  vllm-cluster:
    volumes:
      - vllm-models:/models
      - /data/models:/models:ro
    networks:
      - optimized-swarm
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  chroma-data:
    driver: local
  memory-data:
    driver: local
  vllm-models:
    driver: local

networks:
  optimized-swarm:
    driver: overlay
    attachable: true
```

#### 2.2 Storage Monitoring Setup
**Monitoring Tools:**
```bash
# Install monitoring tools
apt install install smartmontools iostat sysstat

# Configure SMART monitoring
smartctl -a /dev/nvme0n1
smartctl -a /dev/nvme1n1
smartctl -a /dev/nvme2n1
smartctl -a /dev/nvme3n1

# Set up performance monitoring
iostat -x 10
vmstat 5
```

**Alert Thresholds:**
- **SMART Errors**: Immediate alert on critical errors
- **Temperature**: >70°C alert
- **Usage**: >80% utilization alert
- **IOPS**: <50% of baseline alert

### Phase 3: Data Migration Strategy (Week 2)

#### 3.1 ChromaDB Data Migration
**Source**: `/home/maxvamp/chromadb-data`
**Destination**: `/data/enhanced/chromadb`

**Migration Procedure:**
```bash
# Create backup
borg create /mnt/borg-backup::chromadb-$(date +%Y%m%d-%H%M%S) /home/maxvamp/chromadb-data

# Stop ChromaDB service
docker stop chromadb

# Migrate data
rsync -av --progress /home/maxvamp/chromadb-data/ /data/enhanced/chromadb/

# Update container configuration
sed -i 's|/home/maxvamp/chromadb-data|/data/enhanced/chromadb|' docker-compose.yml

# Start ChromaDB service
docker start chromadb

# Verify data integrity
diff -r /home/maxvamp/chromadb-data /data/enhanced/chromadb
```

#### 3.2 Memory Service Data Migration
**Source**: Current memory service volumes
**Destination**: `/data/enhanced/memory-service`

**Migration Steps:**
1. Stop memory service container
2. Backup existing data
3. Migrate to enhanced storage
4. Update container configuration
5. Restart and validate service

### Phase 4: Backup Integration (Week 2)

#### 4.1 Enhanced Backup Strategy
**Backup Schedule:**
- **Daily**: Full system backups
- **Hourly**: Incremental backups for critical data
- **Weekly**: Off-site backup rotation

**Backup Configuration:**
```bash
# Enhanced Borg backup configuration
export BORG_RSH='ssh -o BatchMode=yes'
export BORG_PASSPHRASE='secure-backup-password'

# Daily backup
borg create --compression lz4 --progress /mnt/borg-backup::daily-{now} \
  /data/enhanced /home/maxvamp/chromadb-data /home/maxvamp/memory-data

# Weekly backup  
borg create --compression lz4 --progress /mnt/borg-backup::weekly-{now} \
  --files-cache /data/enhanced

# Prune old backups
borg prune --keep-daily=7 --keep-weekly=4 --keep-monthly=6 /mnt/borg-backup
```

#### 4.2 Backup Verification
**Verification Procedures:**
1. **Data Integrity Check**: MD5/SHA256 hash verification
2. **Restore Test**: Monthly restore testing
3. **Backup Size Monitoring**: Alert on abnormal growth
4. **Backup Success Rate**: >99% success rate required

### Phase 5: Performance Optimization (Week 3)

#### 5.1 Container Storage Optimizations
**Container Filesystem Tuning:**
```bash
# Optimize container storage performance
sysctl -w vm.swappiness=10
sysctl -w vm.vfs_cache_pressure=50

# Optimize Docker storage driver
echo 'storage-driver=overlay2' >> /etc/docker/daemon.json

# Enable TRIM for SSD optimization
fstrim -v /data/chroma
fstrim -v /data/memory
fstrim -v /data/models
```

#### 5.2 I/O Performance Monitoring
**Monitoring Scripts:**
```bash
#!/bin/bash
# iops-monitor.sh - Monitor I/O operations
iostat -x 10 | tee -a /var/log/iops-monitor.log

# Alert on I/O performance degradation
if [ $(iostat -x 1 | awk 'NR>3 {print $12}') -gt 80 ]; then
    echo "High I/O wait detected" | logger -t storage-alert
fi
```

### Phase 6: Capacity Planning (Week 4)

#### 6.1 Storage Growth Projections
**Current Utilization:**
- **SARK**: 54% (1.9TB/3.7TB)
- **CLU**: 37% (1.3TB/3.7TB)

**Growth Projections:**
- **Year 1**: +20% utilization
- **Year 2**: +40% utilization
- **Year 3**: +60% utilization

**Expansion Strategy:**
- **Threshold 1 (60%)**: Add additional container storage volumes
- **Threshold 2 (80%)**: Implement data compression
- **Threshold 3 (90%)**: Archive cold data to external storage

#### 6.2 Storage Architecture Evolution
**Current Architecture (Version 1):**
```
┌─────────────────────────────────────────────────────────┐
│                   Container Storage Layer                 │
│             (Docker Volumes + Host Mounts)              │
│           Current: Containerized → Future: Multi-Tier    │
└─────────────────────────────────────────────────────────┘
```

**Future Architecture (Version 2):**
```
┌─────────────────────────────────────────────────────────┐
│                   Container Storage Layer                 │
│             (Docker Volumes + Host Mounts)              │
│           Current: Containerized → Future: Multi-Tier    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    External Storage Layer                 │
│              (Cloud Storage + Object Storage)            │
│           Future: 50TB+ Cloud Integration                │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    Archive Storage Layer                  │
│               (Cold Data + Long-term)                   │
│           Future: 100TB+ Archive Integration            │
└─────────────────────────────────────────────────────────┘
```

### Version 2 Storage Enhancements (Future Implementation)
- **RAID 10 Implementation**: Multi-NVMe array for performance and redundancy
- **Cloud Storage Integration**: AWS S3, Azure Blob storage integration
- **Multi-site Replication**: Geographically distributed storage
- **Automated Tiering**: Hot-warm-cold data automatic migration

## Implementation Timeline

### Week 1: Assessment and Planning
- [ ] Complete storage utilization analysis
- [ ] Document current performance metrics
- [ ] Create capacity growth projections
- [ ] Define alert thresholds

### Week 2: Implementation
- [ ] Configure containerized storage volumes
- [ ] Set up storage monitoring
- [ ] Migrate ChromaDB data to container volumes
- [ ] Migrate memory service data to container volumes
- [ ] Configure enhanced backup strategy for containers

### Week 3: Optimization
- [ ] Implement filesystem optimizations
- [ ] Deploy I/O performance monitoring
- [ ] Test backup and restore procedures
- [ ] Validate data integrity

### Week 4: Validation
- [ ] Performance baseline establishment
- [ ] Capacity planning finalization
- [ ] Documentation completion
- [ ] Training and knowledge transfer

## Success Criteria

### Performance Metrics
- **IOPS**: >50,000 IOPS sustained (containerized storage)
- **Throughput**: >1GB/s read, >500MB/s write
- **Latency**: <5ms average response time
- **Availability**: >99.9% uptime
- **Container Portability**: 100% container-based deployment

### Capacity Metrics
- **Growth Rate**: <20% annual growth
- **Utilization**: <80% sustained utilization
- **Expansion**: Auto-scaling capability
- **Backup**: 99.9% backup success rate

### Operational Metrics
- **Alert Response**: <15 minutes for critical alerts
- **MTTR**: <2 hours for storage incidents
- **Backup Verification**: 100% data integrity
- **Performance Monitoring**: 100% service coverage

## Risk Assessment

### High Priority Risks
1. **Data Loss During Migration**
   - **Mitigation**: Comprehensive backup before migration
   - **Owner**: Operations Team

2. **Performance Degradation**
   - **Mitigation**: Performance testing before migration
   - **Owner**: Infrastructure Team

3. **RAID Configuration Failure**
   - **Mitigation**: Test configuration in staging environment
   - **Owner**: Storage Team

### Medium Priority Risks
1. **Backup System Overload**
   - **Mitigation**: Monitor backup system performance
   - **Owner**: Backup Team

2. **Storage Fragmentation**
   - **Mitigation**: Regular filesystem optimization
   - **Owner**: Operations Team

## Monitoring and Alerting

### Key Metrics
- **Storage Utilization**: Real-time monitoring
- **I/O Performance**: Continuous monitoring
- **Backup Status**: Daily verification
- **Container Health**: Continuous monitoring

### Alert Configuration
- **Critical**: Container storage failure, data corruption
- **Warning**: High utilization, performance degradation
- **Info**: Backup completion, capacity planning

## Conclusion

This storage optimization plan provides a comprehensive approach to enhancing storage performance, reliability, and scalability through a containerized storage architecture. The container-based implementation ensures easy migration and scalability, while the enhanced backup strategy ensures data protection and disaster recovery capabilities.

The phased approach minimizes risk and ensures smooth transition while maintaining system availability and performance. The containerized architecture allows for easy migration to future hardware enhancements (Version 2) including RAID 10 and cloud storage integration.

---
*Created: $(date)*
*Version: 1.0*
*Status: Draft*
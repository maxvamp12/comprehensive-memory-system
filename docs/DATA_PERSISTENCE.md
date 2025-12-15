# Memory System Data Persistence Guide

## Overview

This document explains how data persistence works in the Docker deployment and provides instructions for backup, restore, and data management operations.

## Data Persistence Architecture

### Current Configuration

The memory system uses **host volume mounts** for data persistence, ensuring that:
- Data survives container recreation
- Data is easily accessible for backups
- Data location is explicit and configurable

### Directory Structure

```
/opt/memory-system/
├── data/                    # Main data storage
│   ├── memories/           # Memory JSON files
│   ├── embeddings/         # Vector embeddings
│   ├── indexes/           # Search indexes
│   └── logs/              # Application logs
├── backups/               # Backup storage
└── ssl/                   # SSL certificates (optional)
```

### Data Locations

#### **Primary Data Directory**: `/opt/memory-system/`

This directory contains all persistent data:

1. **`/opt/memory-system/data/`** - Core data storage
   - `memories/` - Individual memory files (JSON format)
   - `embeddings/` - Vector embedding files
   - `indexes/` - Search indexes for performance
   - `logs/` - Application logs

2. **`/opt/memory-system/backups/`** - Backup files
   - Automated backups stored here
   - Retains last 7 days of backups

3. **`/opt/memory-system/ssl/`** - SSL certificates
   - Place SSL certificates here for HTTPS

## Backup and Restore Operations

### Creating Backups

```bash
# Create manual backup
./manage-data.sh backup

# List available backups
./manage-data.sh list

# Validate data integrity
./manage-data.sh validate
```

### Restoring from Backup

```bash
# Restore from specific backup file
./manage-data.sh restore /opt/memory-system/backups/memory_backup_20240101_120000.tar.gz
```

### Automated Backups

The system includes automated backup capabilities:

```bash
# Add to crontab for daily backups
0 2 * * * /opt/memory-system/manage-data.sh backup
```

## Data Management Commands

### 1. Backup Operation
```bash
./manage-data.sh backup
```
- Creates compressed backup of all data
- Excludes temporary files and logs
- Retains last 7 backups automatically

### 2. List Backups
```bash
./manage-data.sh list
```
- Shows all available backups
- Displays file sizes and dates
- Shows retention policy

### 3. Restore Operation
```bash
./manage-data.sh restore /path/to/backup.tar.gz
```
- Restores from specific backup
- Creates backup of current data first
- Validates restored data integrity

### 4. Data Validation
```bash
./manage-data.sh validate
```
- Checks data directory structure
- Validates memory file integrity
- Tests ChromaDB connection
- Reports any issues found

## Docker Volume Configuration

### Current Docker Setup

The Docker containers use explicit host volume mounts:

```yaml
volumes:
  - /opt/memory-system/data:/app/data
  - /opt/memory-system/logs:/app/logs
  - /opt/memory-system/backups:/app/backups
```

### Data Persistence Strategy

1. **Container Recreation**: Data persists when containers are recreated
2. **Host Mounts**: Data stored directly on CLU filesystem
3. **Backup Integration**: Automated backup integration
4. **Accessibility**: Direct filesystem access for management

## Backup Strategy

### Retention Policy
- **Daily backups**: 7 days retention
- **Weekly backups**: 4 weeks retention (planned)
- **Monthly backups**: 12 months retention (planned)

### Backup Contents
- All memory files (JSON format)
- Embedding data
- Search indexes
- Configuration files
- Excludes: logs, temporary files, node_modules

### Backup Format
- **Format**: Compressed tar.gz
- **Naming**: `memory_backup_YYYYMMDD_HHMMSS.tar.gz`
- **Verification**: MD5 checksum validation (planned)

## Data Migration

### Moving Data Between Systems

1. **Export Data**:
```bash
# Create backup
./manage-data.sh backup
```

2. **Transfer Backup**:
```bash
# Copy backup to new system
scp /opt/memory-system/backups/memory_backup_*.tar.gz new-system:/opt/memory-system/backups/
```

3. **Import Data**:
```bash
# Restore on new system
./manage-data.sh restore /opt/memory-system/backups/memory_backup_*.tar.gz
```

### Upgrading Containers

1. **Create backup**: `./manage-data.sh backup`
2. **Stop containers**: `docker-compose down`
3. **Update images**: `docker-compose pull`
4. **Restart containers**: `docker-compose up -d`
5. **Validate data**: `./manage-data.sh validate`

## Disaster Recovery

### Emergency Procedures

1. **Data Corruption**:
```bash
# Validate data integrity
./manage-data.sh validate

# Restore from latest backup
./manage-data.sh restore /opt/memory-system/backups/latest_backup.txt
```

2. **Container Failure**:
```bash
# Restart containers
docker-compose restart

# Check health
curl http://localhost:3000/health
```

3. **Complete System Failure**:
```bash
# Restore from backup
./manage-data.sh restore /path/to/latest/backup.tar.gz

# Restart services
docker-compose up -d
```

## Security Considerations

### Data Protection

1. **Access Control**: 
   - Set proper file permissions: `chmod 750 /opt/memory-system/`
   - Restrict access to authorized users only

2. **Backup Security**:
   - Encrypt backups in production
   - Store backups in secure location
   - Implement access controls for backup files

3. **Network Security**:
   - Use HTTPS in production
   - Implement firewall rules
   - Monitor access logs

### Compliance

1. **Data Retention**: Follow organizational policies
2. **Data Deletion**: Implement secure deletion procedures
3. **Audit Logs**: Maintain access and change logs

## Monitoring and Maintenance

### Regular Tasks

1. **Daily**:
   - Check health: `curl http://localhost:3000/health`
   - Monitor logs: `tail -f /opt/memory-system/logs/server.log`

2. **Weekly**:
   - Validate data: `./manage-data.sh validate`
   - Create backup: `./manage-data.sh backup`
   - Review disk usage: `df -h /opt/memory-system`

3. **Monthly**:
   - Review backup retention
   - Test restore procedures
   - Update security patches

### Performance Monitoring

```bash
# Monitor disk usage
du -sh /opt/memory-system/*

# Monitor memory usage
docker stats memory-system

# Monitor API performance
curl -w "Time: %{time_total}s\nSize: %{size_download} bytes\n" -o /dev/null http://localhost:3000/health
```

## Troubleshooting

### Common Issues

1. **Permission Errors**:
```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/memory-system/
sudo chmod -R 750 /opt/memory-system/
```

2. **Disk Space Issues**:
```bash
# Check disk usage
df -h /opt/memory-system

# Clean old logs
find /opt/memory-system/logs -name "*.log" -mtime +30 -delete
```

3. **Data Corruption**:
```bash
# Validate data integrity
./manage-data.sh validate

# Restore from backup
./manage-data.sh restore /path/to/backup.tar.gz
```

### Emergency Recovery

1. **System Unavailable**:
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Restart services
docker-compose restart
```

2. **Data Corruption**:
```bash
# Restore from backup
./manage-data.sh restore /opt/memory-system/backups/latest_backup.txt

# Validate restore
./manage-data.sh validate
```

## Summary

- **Data Persistence**: Host volume mounts ensure data survives container recreation
- **Backup Strategy**: Automated backups with 7-day retention
- **Data Location**: `/opt/memory-system/` on CLU filesystem
- **Recovery**: Full restore capabilities from backups
- **Security**: Proper access controls and encryption options

This setup ensures that your memory system data is persistent, backup, and easily recoverable while maintaining the flexibility to recreate containers without data loss.
#!/bin/bash

# Memory Server Backup Script
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="memory_backup_$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "🔄 Creating memory backup..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="logs/*.log" \
    --exclude="backups" \
    ./

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 backups
ls -t $BACKUP_DIR/memory_backup_*.tar.gz | tail -n +8 | xargs rm -f

echo "🧹 Cleaned up old backups"

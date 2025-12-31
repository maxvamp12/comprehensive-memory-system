#!/bin/bash

# Borg Backup Script Extension for CLU Memory System
# This script extends your existing backup.sh to include CLU memory system data
# Add this script to your SARK server at ~/borg-docker/backup-clu.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLU_IP="192.168.68.71"  # Correct CLU cluster IP address
BACKUP_SCRIPT="/home/maxvamp/borg-docker/backup.sh"
LOG_FILE="/home/maxvamp/borg-docker/backup-clu.log"

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check CLU connectivity
check_clu_connectivity() {
    print_info "Checking CLU connectivity..."
    
    if ! ping -c 1 -W 5 $CLU_IP > /dev/null 2>&1; then
        print_error "Cannot reach CLU at $CLU_IP"
        print_info "Please ensure CLU is running and accessible"
        return 1
    fi
    
    print_status "CLU connectivity verified"
    
    # Check if memory system data directory exists
    if ! ssh maxvamp@$CLU_IP "test -d /opt/memory-system/data"; then
        print_warning "Memory system data directory not found on CLU"
        print_info "Memory system may not be deployed yet"
        return 1
    fi
    
    # Check if Redis data directory exists
    if ! ssh maxvamp@$CLU_IP "docker exec redis-caching test -d /data"; then
        print_warning "Redis data directory not accessible on CLU"
        return 1
    fi
    
    print_status "Memory system and Redis data directories verified on CLU"
    return 0
}

# Check container status
check_container_status() {
    local container_name=$1
    print_info "Checking $container_name container status..."
    
    local status=$(ssh maxvamp@$CLU_IP "docker ps -q --filter name=$container_name")
    if [ -n "$status" ]; then
        print_status "$container_name container is running"
        return 0
    else
        print_warning "$container_name container is not running"
        return 1
    fi
}

# Backup Redis data
backup_redis_data() {
    print_info "Backing up Redis data..."
    
    # Trigger Redis BGSAVE
    if ssh maxvamp@$CLU_IP "docker exec redis-caching redis-cli BGSAVE"; then
        print_status "Redis BGSAVE triggered successfully"
        sleep 2  # Give time for save to complete
    else
        print_warning "Redis BGSAVE failed, continuing with sync"
    fi
    
    return 0
}

# Stop containers for consistent backup
stop_containers() {
    print_info "Stopping containers for consistent backup..."

    # Stop MCP Memory System (new Python-based)
    if ssh maxvamp@$CLU_IP "docker stop mcp-memory-system 2>/dev/null"; then
        print_status "MCP Memory System stopped"
    else
        print_warning "MCP Memory System not running or not deployed"
    fi

    # Stop Memory Service (legacy)
    if ssh maxvamp@$CLU_IP "docker stop enhanced-memory-service 2>/dev/null"; then
        print_status "Enhanced Memory Service stopped"
    else
        print_warning "Enhanced Memory Service already stopped or failed to stop"
    fi

    # Stop Redis
    if ssh maxvamp@$CLU_IP "docker stop redis-caching 2>/dev/null"; then
        print_status "Redis caching service stopped"
    else
        print_warning "Redis caching service already stopped or failed to stop"
    fi

    sleep 3  # Give time for processes to clean up
}

# Start containers after backup
start_containers() {
    print_info "Starting containers after backup..."

    # Start Redis first (dependency for Memory Service)
    if ssh maxvamp@$CLU_IP "docker start redis-caching 2>/dev/null"; then
        print_status "Redis caching service started"
        sleep 2  # Give Redis time to initialize
    else
        print_error "Failed to start Redis caching service"
    fi

    # Start MCP Memory System (new Python-based)
    if ssh maxvamp@$CLU_IP "docker start mcp-memory-system 2>/dev/null"; then
        print_status "MCP Memory System started"
    else
        print_warning "MCP Memory System not deployed or failed to start"
    fi

    # Start Memory Service (legacy)
    if ssh maxvamp@$CLU_IP "docker start enhanced-memory-service 2>/dev/null"; then
        print_status "Enhanced Memory Service started"
    else
        print_error "Failed to start Enhanced Memory Service"
    fi

    # Verify containers are running
    sleep 5
    check_container_status "redis-caching"
    check_container_status "mcp-memory-system" || true
    check_container_status "enhanced-memory-service"
}

# Sync CLU data to SARK for backup
sync_clu_data() {
    print_info "Syncing CLU data to SARK..."

    # Create local directory for CLU data
    CLU_BACKUP_DIR="/home/maxvamp/clu-backup"
    mkdir -p "$CLU_BACKUP_DIR"

    # Sync MCP memory system data (new Python-based)
    print_info "Syncing /opt/mcp-memory-system/data from CLU..."
    if rsync -avz --delete \
        -e "ssh -o BindAddress=192.168.68.69" \
        maxvamp@$CLU_IP:/opt/mcp-memory-system/data/ \
        "$CLU_BACKUP_DIR/mcp-memory-system-data/" 2>&1; then
        print_status "MCP memory system data synced successfully"
    else
        print_warning "MCP memory system data sync failed (may not be deployed yet)"
    fi

    # Sync legacy memory system data from CLU
    print_info "Syncing /opt/memory-system/data from CLU..."
    if rsync -avz --delete \
        -e "ssh -o BindAddress=192.168.68.69" \
        maxvamp@$CLU_IP:/opt/memory-system/data/ \
        "$CLU_BACKUP_DIR/memory-system-data/" 2>&1; then
        print_status "Memory system data synced successfully"
    else
        print_error "Failed to sync memory system data"
        return 1
    fi

    # Sync Redis data from CLU
    print_info "Syncing Redis data from CLU..."
    if rsync -avz --delete \
        -e "ssh -o BindAddress=192.168.68.69" \
        maxvamp@$CLU_IP:/data/ \
        "$CLU_BACKUP_DIR/redis-data/" 2>&1; then
        print_status "Redis data synced successfully"
    else
        print_error "Failed to sync Redis data"
        return 1
    fi

    return 0
}

# Backup CLU memory system data
backup_clu_data() {
    print_info "Starting CLU memory system backup..."
    
    # Check CLU connectivity
    if ! check_clu_connectivity; then
        print_warning "CLU connectivity check failed, skipping CLU backup"
        return 0
    fi
    
    # Backup Redis data first
    backup_redis_data
    
    # Stop containers for consistent backup
    print_info "Stopping containers for consistent backup..."
    stop_containers
    
    # Sync CLU data to SARK
    if sync_clu_data; then
        print_status "CLU data synced successfully"
    else
        print_error "CLU data sync failed"
        return 1
    fi
    
    # Start containers after backup
    print_info "Starting containers after backup..."
    start_containers
    
    print_status "CLU memory system backup completed successfully"
    return 0
}

# Main function
main() {
    echo "🗃️  CLU Memory System Backup Extension"
    echo "====================================="
    
    # Check if backup.sh exists
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        print_error "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    # Check if CLU is needed
    if [ "$1" = "--skip-clu" ]; then
        print_info "Skipping CLU backup as requested"
        exec "$BACKUP_SCRIPT"
    fi
    
    # Run CLU backup
    if backup_clu_data; then
        print_status "CLU backup completed successfully"
    else
        print_error "CLU backup failed"
        exit 1
    fi
    
    # Run main backup
    print_info "Running main backup script..."
    "$BACKUP_SCRIPT"
    
    print_status "CLU backup extension completed"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up temporary files..."
    # Add any cleanup operations here
}

# Handle cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"

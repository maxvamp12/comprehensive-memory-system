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
CLU_IP="192.168.100.11"  # CLU cluster IP on high-speed private network (spark-f4cd)
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
    
    print_status "Memory system data directory verified on CLU"
    return 0
}

# Check memory system container status
check_memory_container() {
    print_info "Checking memory system container status..."
    
    local status=$(ssh maxvamp@$CLU_IP "docker ps -q --filter name=memory-system")
    if [ -n "$status" ]; then
        print_status "Memory system container is running"
        return 0
    else
        print_warning "Memory system container is not running"
        return 1
    fi
}

# Stop memory system container for consistent backup
stop_memory_container() {
    print_info "Stopping memory system container on CLU..."
    
    if ssh maxvamp@$CLU_IP "docker stop memory-system"; then
        print_status "Memory system container stopped successfully"
        sleep 3  # Give time for processes to clean up
        return 0
    else
        print_warning "Could not stop memory system container (may already be stopped)"
        return 0
    fi
}

# Start memory system container after backup
start_memory_container() {
    print_info "Starting memory system container on CLU..."
    
    if ssh maxvamp@$CLU_IP "docker start memory-system"; then
        print_status "Memory system container started successfully"
        return 0
    else
        print_error "Failed to start memory system container"
        return 1
    fi
}

# Cleanup CLU data mount
cleanup_clu_mount() {
    print_info "Cleaning up CLU data mount..."
    
    MOUNT_POINT="/tmp/clu-memory-system"
    
    if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
        umount "$MOUNT_POINT"
        print_status "Unmounted CLU data"
    fi
    
    if [ -d "$MOUNT_POINT" ]; then
        rmdir "$MOUNT_POINT"
        print_status "Removed mount point"
    fi
}

# Sync CLU data to SARK for backup
sync_clu_data() {
    print_info "Syncing CLU memory system data to SARK..."

    # Create local directory for CLU data
    CLU_BACKUP_DIR="/home/maxvamp/clu-backup"
    mkdir -p "$CLU_BACKUP_DIR"

    # Sync memory system data from CLU (force use of private 192.168.100.x network)
    print_info "Syncing /opt/memory-system/data from CLU via private network..."
    rsync -avz --delete \
        -e "ssh -o BindAddress=192.168.100.10" \
        maxvamp@192.168.100.11:/opt/memory-system/data/ \
        "$CLU_BACKUP_DIR/memory-system-data/" 2>&1 || {
        print_warning "Failed to sync memory-system data"
    }

    print_status "CLU data synced to $CLU_BACKUP_DIR"
}

# Backup CLU memory system data
backup_clu_data() {
    print_info "Starting CLU memory system backup..."

    # Check CLU connectivity
    if ! check_clu_connectivity; then
        print_warning "CLU connectivity check failed, skipping CLU backup"
        return 0
    fi

    # Check current container status
    print_info "Checking current memory system container status..."
    local was_running=0
    if check_memory_container; then
        was_running=1
    fi

    # Stop memory container for consistent backup
    print_info "Stopping memory system container for consistent backup..."
    stop_memory_container

    # Sync CLU data to SARK
    sync_clu_data

    print_status "CLU memory system backup setup completed successfully"
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
    backup_clu_data
    
    # Run main backup
    print_info "Running main backup script..."
    "$BACKUP_SCRIPT"
    
    # Ensure memory container is restarted after backup
    print_info "Ensuring memory system container is running..."
    start_memory_container
    check_memory_container
    
    print_status "CLU backup extension completed"
}

# Cleanup function
cleanup() {
    cleanup_clu_mount
}

# Handle cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
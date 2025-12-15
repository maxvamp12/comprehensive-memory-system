#!/bin/bash

# Memory System Backup and Data Management Script
# This script manages data persistence and backups for the Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATA_DIR="/opt/memory-system"
BACKUP_DIR="/opt/memory-system/backups"
DATA_VOLUMES=(
    "/opt/memory-system/data"
    "/opt/memory-system/logs"
    "/opt/memory-system/backups"
)

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

# Check if running as root for system operations
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root - system-wide operations will be performed"
    else
        print_info "Running as user - will perform user-level operations"
    fi
}

# Create data directory structure
setup_data_directories() {
    print_info "Setting up data directory structure..."
    
    for dir in "${DATA_VOLUMES[@]}"; do
        if [[ ! -d "$dir" ]]; then
            print_info "Creating directory: $dir"
            mkdir -p "$dir"
            
            # Set appropriate permissions
            if [[ $EUID -eq 0 ]]; then
                chown $USER:$USER "$dir"
                chmod 755 "$dir"
            else
                chmod 755 "$dir"
            fi
        else
            print_status "Directory exists: $dir"
            
            # Set permissions if needed
            if [[ $EUID -eq 0 ]]; then
                chown $USER:$USER "$dir"
                chmod 755 "$dir"
            fi
        fi
    done
    
    print_status "Data directory structure ready"
}

# Show current data usage
show_data_usage() {
    echo ""
    echo "📊 Current Data Usage:"
    echo "===================="
    
    for dir in "${DATA_VOLUMES[@]}"; do
        if [[ -d "$dir" ]]; then
            size=$(du -sh "$dir" 2>/dev/null | cut -f1)
            echo "   • $dir: $size"
        fi
    done
    
    echo "===================="
    echo ""
}

# Create backup
create_backup() {
    local backup_name="memory_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_info "Creating backup: $backup_name"
    
    # Stop services if running
    if docker-compose -f docker-compose.backup.yml ps | grep -q "Up"; then
        print_info "Stopping services for backup..."
        docker-compose -f docker-compose.backup.yml down
    fi
    
    # Create backup
    tar -czf "$backup_path" \
        --exclude="node_modules" \
        --exclude="logs/*.log" \
        --exclude="backups" \
        --exclude="*.tmp" \
        --exclude="*.cache" \
        -C "$(dirname "$DATA_DIR")" \
        "$(basename "$DATA_DIR")"
    
    # Restart services if they were running
    if [[ -f "$DATA_DIR/running.flag" ]]; then
        print_info "Restarting services..."
        docker-compose -f docker-compose.backup.yml up -d
        rm -f "$DATA_DIR/running.flag"
    fi
    
    # Calculate backup size
    backup_size=$(du -sh "$backup_path" | cut -f1)
    
    print_status "Backup created: $backup_path"
    print_status "Backup size: $backup_size"
    
    # Clean up old backups (keep last 7)
    print_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/memory_backup_*.tar.gz | tail -n +8 | xargs rm -f
    
    print_status "Backup cleanup completed"
    echo "$backup_path" > "$BACKUP_DIR/latest_backup.txt"
}

# Restore from backup
restore_backup() {
    local backup_path="$1"
    
    if [[ -z "$backup_path" ]]; then
        print_error "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [[ ! -f "$backup_path" ]]; then
        print_error "Backup file not found: $backup_path"
        exit 1
    fi
    
    print_info "Restoring from backup: $backup_path"
    
    # Stop services
    if docker-compose -f docker-compose.backup.yml ps | grep -q "Up"; then
        print_info "Stopping services for restore..."
        docker-compose -f docker-compose.backup.yml down
        touch "$DATA_DIR/running.flag"
    fi
    
    # Create backup of current data
    create_backup
    
    # Remove current data (except logs and backups)
    print_info "Removing current data..."
    rm -rf "$DATA_DIR/data" "$DATA_DIR/backups"
    
    # Extract backup
    tar -xzf "$backup_path" -C "$(dirname "$DATA_DIR")"
    
    # Restart services
    if [[ -f "$DATA_DIR/running.flag" ]]; then
        print_info "Restarting services..."
        docker-compose -f docker-compose.backup.yml up -d
        rm -f "$DATA_DIR/running.flag"
    fi
    
    print_status "Restore completed successfully"
}

# List available backups
list_backups() {
    echo ""
    echo "📦 Available Backups:"
    echo "===================="
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_warning "No backup directory found"
        return
    fi
    
    ls -la "$BACKUP_DIR"/memory_backup_*.tar.gz | while read -r line; do
        local file=$(echo "$line" | awk '{print $9}')
        local size=$(echo "$line" | awk '{print $5}')
        local date=$(basename "$file" | sed 's/memory_backup_//' | sed 's/.tar.gz//')
        date=$(echo "$date" | sed 's/_/ /g')
        echo "   📅 $date - $size"
    done
    
    echo "===================="
    echo ""
}

# Validate data integrity
validate_data() {
    print_info "Validating data integrity..."
    
    local issues=0
    
    # Check data directory
    if [[ ! -d "$DATA_DIR/data" ]]; then
        print_error "Data directory missing: $DATA_DIR/data"
        ((issues++))
    fi
    
    # Check logs directory
    if [[ ! -d "$DATA_DIR/logs" ]]; then
        print_error "Logs directory missing: $DATA_DIR/logs"
        ((issues++))
    fi
    
    # Check for corrupted memory files
    if [[ -d "$DATA_DIR/data/memories" ]]; then
        local corrupted_count=0
        for file in "$DATA_DIR/data/memories"/*.json; do
            if [[ -f "$file" ]]; then
                if ! jq empty "$file" 2>/dev/null; then
                    print_warning "Corrupted memory file: $file"
                    ((corrupted_count++))
                fi
            fi
        done
        if [[ $corrupted_count -gt 0 ]]; then
            print_error "Found $corrupted_count corrupted memory files"
            ((issues++))
        fi
    fi
    
    # Check ChromaDB connection
    if ! curl -f -s -u admin:admin http://192.168.68.69:8001/api/v1/heartbeat > /dev/null; then
        print_warning "ChromaDB connection test failed"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        print_status "Data validation passed - no issues found"
    else
        print_error "Data validation failed - $issues issues found"
    fi
}

# Show data location info
show_data_locations() {
    echo ""
    echo "🗂️  Data Location Information:"
    echo "============================"
    echo "Data Directory: $DATA_DIR"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "📁 Directory Structure:"
    echo "   • $DATA_DIR/data/ - Memory storage"
    echo "   • $DATA_DIR/logs/ - Application logs"
    echo "   • $DATA_DIR/backups/ - Backup files"
    echo ""
    echo "🔧 File Locations:"
    echo "   • Memories: $DATA_DIR/data/memories/"
    echo "   • Embeddings: $DATA_DIR/data/embeddings/"
    echo "   • Indexes: $DATA_DIR/data/indexes/"
    echo "   • Logs: $DATA_DIR/logs/"
    echo "   • Backups: $BACKUP_DIR/"
    echo ""
    echo "💾 Backup Location:"
    echo "   • Latest backup: $BACKUP_DIR/latest_backup.txt"
    echo "   • Backup retention: 7 days"
    echo ""
}

# Main function
main() {
    echo "🗃️  Memory System Data Management"
    echo "================================="
    
    check_root
    setup_data_directories
    show_data_locations
    show_data_usage
    
    case "${1:-usage}" in
        "backup")
            create_backup
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "validate")
            validate_data
            ;;
        "usage")
            echo ""
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  backup     - Create a backup of all data"
            echo "  restore    - Restore from a backup file"
            echo "  list       - List available backups"
            echo "  validate   - Validate data integrity"
            echo "  usage      - Show this help message"
            echo ""
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 usage' for help"
            exit 1
            ;;
    esac
    
    print_status "Operation completed"
}

# Run main function
main "$@"
#!/bin/bash

# Fix Vorta SSH Configuration for Borg Repository
# This script updates Vorta to use the correct SSH command for Borg operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_info "Starting Vorta SSH Configuration Fix"
print_info "========================================"

# Check if Vorta database exists
VORTA_DB="$HOME/Library/Application Support/Vorta/settings.db"
if [[ ! -f "$VORTA_DB" ]]; then
    print_error "Vorta database not found at $VORTA_DB"
    print_info "Please ensure Vorta is installed and configured"
    exit 1
fi

# Get current repository configuration
print_info "Current repository configuration:"
sqlite3 "$VORTA_DB" "SELECT id, url, name FROM repomodel WHERE id = 4;"

# Update repository URL to use maxvamp user (already done)
print_info "Updating repository URL to use maxvamp user..."
sqlite3 "$VORTA_DB" "UPDATE repomodel SET url = 'ssh://maxvamp@192.168.68.69:22/mnt/borg-backup/borg-repo' WHERE id = 4;"

# Update passphrase
print_info "Updating repository passphrase..."
sqlite3 "$VORTA_DB" "UPDATE repopassword SET password = 'TazKitty12@' WHERE id = 4;"
sqlite3 "$VORTA_DB" "UPDATE repopassword SET url = 'ssh://maxvamp@192.168.68.69:22/mnt/borg-backup/borg-repo' WHERE id = 4;"

# Optimize database
print_info "Optimizing database..."
sqlite3 "$VORTA_DB" "VACUUM;"

# Verify changes
print_info "Updated repository configuration:"
sqlite3 "$VORTA_DB" "SELECT id, url, name FROM repomodel WHERE id = 4;"

print_status "Vorta SSH configuration updated successfully!"
print_info ""
print_info "Next steps:"
print_info "1. Restart Vorta completely"
print_info "2. Test SSH connection to: ssh://maxvamp@192.168.68.69:22/mnt/borg-backup/borg-repo"
print_info "3. If connection fails, the issue may be that Borg requires Docker container execution"
print_info "4. Consider using port 2222 if available, as it may have been configured for Borg operations"

print_info ""
print_info "Note: If SSH connection still fails, you may need to:"
print_info "- Check if Borg backup container is running: sudo docker ps | grep borg"
print_info "- Verify SSH server allows Borg command execution"
print_info "- Consider using the dedicated Borg SSH port (2222) if available"
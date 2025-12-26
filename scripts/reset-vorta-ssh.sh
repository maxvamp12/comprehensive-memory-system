#!/bin/bash

# Vorta Configuration Reset Script
# Resets Vorta SSH configuration while preserving existing key authentication
# Run this script on FLYNN (where Vorta runs)

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

# Check if Vorta is installed
if ! command -v vorta &> /dev/null; then
    print_error "Vorta is not installed or not in PATH"
    print_info "Please install Vorta first: https://github.com/borgbase/vorta"
    exit 1
fi

print_info "Starting Vorta SSH Configuration Reset"
print_info "=========================================="

# Get Vorta configuration directory
VORTA_CONFIG_DIR="$HOME/.config/vorta"
VORTA_DB="$VORTA_CONFIG_DIR/main.db"

# Check if Vorta config exists
if [[ ! -d "$VORTA_CONFIG_DIR" ]]; then
    print_warning "Vorta configuration directory not found: $VORTA_CONFIG_DIR"
    print_info "Vorta may not have been configured yet"
    exit 1
fi

# Backup existing Vorta configuration
print_info "Backing up existing Vorta configuration..."
BACKUP_DIR="$HOME/vorta-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [[ -f "$VORTA_DB" ]]; then
    cp "$VORTA_DB" "$BACKUP_DIR/vorta.db"
    print_status "Vorta database backed up to $BACKUP_DIR/vorta.db"
else
    print_warning "Vorta database not found at $VORTA_DB"
fi

if [[ -d "$VORTA_CONFIG_DIR/settings" ]]; then
    cp -r "$VORTA_CONFIG_DIR/settings" "$BACKUP_DIR/"
    print_status "Vorta settings backed up to $BACKUP_DIR/settings"
fi

# Clear Vorta SSH configuration
print_info "Clearing Vorta SSH configuration..."

# Remove any existing SSH key references
if [[ -f "$VORTA_CONFIG_DIR/settings/ssh_keys.json" ]]; then
    print_info "Removing existing SSH key configuration..."
    rm "$VORTA_CONFIG_DIR/settings/ssh_keys.json"
    print_status "SSH key configuration cleared"
fi

# Remove any existing repository SSH configurations
if [[ -f "$VORTA_CONFIG_DIR/settings/repositories.json" ]]; then
    print_info "Resetting repository SSH configurations..."
    # Backup the original file
    cp "$VORTA_CONFIG_DIR/settings/repositories.json" "$BACKUP_DIR/repositories.json.backup"
    
    # Create a minimal repositories.json with no SSH configs
    cat > "$VORTA_CONFIG_DIR/settings/repositories.json" << 'EOF'
{
    "repositories": []
}
EOF
    print_status "Repository configurations reset"
fi

# Reset Vorta SSH settings
print_info "Resetting Vorta SSH settings..."

# Reset SSH-specific settings in Vorta config
sqlite3 "$VORTA_DB" "DELETE FROM settings WHERE key LIKE 'ssh_%';" 2>/dev/null || {
    print_warning "Could not clear SSH settings from database (SQLite may be locked)"
}

print_status "Vorta SSH configuration reset completed"

# Test SSH connectivity before Vorta restart
print_info "Testing SSH connectivity to SARK before Vorta restart..."
if timeout 5 nc -z 192.168.68.69 2222; then
    print_status "SSH port 2222 is accessible"
else
    print_warning "SSH port 2222 connectivity test failed"
    print_info "This may be expected if SSH server is not configured for port 2222"
fi

# Restart Vorta to apply changes
print_info "Restarting Vorta to apply configuration changes..."
if pgrep -f "vorta" > /dev/null; then
    print_info "Vorta is running, restarting..."
    pkill -f vorta || true
    sleep 2
    
    # Start Vorta
    if command -v flatpak &> /dev/null; then
        flatpak run com.borgbase.Vorta &
    else
        vorta &
    fi
    print_status "Vorta restarted"
    
    print_info "Vorta is starting up..."
    print_info "Please wait 10-15 seconds for Vorta to fully load"
    sleep 15
else
    print_info "Starting Vorta..."
    if command -v flatpak &> /dev/null; then
        flatpak run com.borgbase.Vorta &
    else
        vorta &
    fi
    print_status "Vorta started"
    
    print_info "Vorta is starting up..."
    print_info "Please wait 10-15 seconds for Vorta to fully load"
    sleep 15
fi

print_status "Vorta configuration reset completed successfully!"
print_info "=========================================="
print_info "Next steps:"
print_info "1. Open Vorta"
print_info "2. Re-add your SSH key if needed"
print_info "3. Re-configure the SARK repository with:"
print_info "   - Host: 192.168.68.69"
print_info "   - Port: 2222"
print_info "   - Path: /mnt/borg-backup/borg-repo"
print_info "   - SSH key: Select your existing SSH private key"
print_info "4. Test the connection"

print_info "Backup saved to: $BACKUP_DIR"
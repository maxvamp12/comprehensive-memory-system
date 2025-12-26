#!/bin/bash

# SSH Port Configuration - Part 1: Backup and Initial Setup
# Run this script first, it will restart SSH service and notify you
# Usage: sudo ./ssh-port-2222-part1.sh

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run with sudo. Use: sudo $0"
    exit 1
fi

print_info "SSH Port Configuration - Part 1: Backup and Setup"
print_info "=========================================================="

# Step 1: Backup current SSH configuration
print_info "Step 1: Backing up current SSH configuration..."
BACKUP_FILE="/etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"
cp /etc/ssh/sshd_config "$BACKUP_FILE"
print_status "SSH config backed up to: $BACKUP_FILE"

# Step 2: Add port 2222 to SSH config
print_info "Step 2: Adding port 2222 to SSH configuration..."
if ! grep -q "^Port 2222" /etc/ssh/sshd_config; then
    if grep -q "^Port 22" /etc/ssh/sshd_config; then
        sed -i '/^Port 22$/a Port 2222' /etc/ssh/sshd_config
        print_status "Added port 2222 after Port 22"
    else
        # If no Port 22 line found, enable it and add port 2222
        sed -i 's/^#Port 22$/Port 22/' /etc/ssh/sshd_config
        echo "Port 2222" >> /etc/ssh/sshd_config
        print_status "Enabled Port 22 and added Port 2222"
    fi
else
    print_warning "Port 2222 already configured"
fi

# Step 3: Save state for Part 2
print_info "Step 3: Saving configuration state..."
cat > /tmp/ssh_config_state.txt << EOF
SSH_CONFIG_UPDATED=true
SSH_RESTARTED=false
BACKUP_FILE="$BACKUP_FILE"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_PART=1
EOF
print_status "Configuration state saved"

# Step 4: Display completion message and instructions
print_status "Part 1 completed successfully!"
print_warning "SSH service will now be restarted"
print_info ""
print_info "=========================================================="
print_info "SSH service will restart in 3 seconds..."
print_info ""
print_info "After SSH restarts, you will be disconnected."
print_info ""
print_info "IMPORTANT INSTRUCTIONS:"
print_info "1. Wait 10 seconds for SSH to fully restart"
print_info "2. Reconnect to SARK using: ssh maxvamp@192.168.68.69"
print_info "3. Run: sudo ./ssh-port-2222-part2.sh"
print_info ""
print_info "Configuration backup: $BACKUP_FILE"
print_info "Resume state: /tmp/ssh_config_state.txt"
print_info "=========================================================="

# Step 5: Restart SSH service with countdown
print_info "Restarting SSH service in 3..."
sleep 1
print_info "Restarting SSH service in 2..."
sleep 1
print_info "Restarting SSH service in 1..."
sleep 1

print_info "Restarting SSH service..."
systemctl restart ssh 2>/dev/null || service ssh restart 2>/dev/null

if [[ $? -eq 0 ]]; then
    print_status "SSH service restarted successfully"
else
    print_error "Failed to restart SSH service"
    exit 1
fi

# Step 6: Mark SSH as restarted
echo "SSH_RESTARTED=true" > /tmp/ssh_config_state.txt

# Step 7: Display final message
print_warning ""
print_warning "SSH service has been restarted."
print_warning "You will be disconnected from this session."
print_warning ""
print_info "Please reconnect to SARK and run Part 2:"
print_info "  ssh maxvamp@192.168.68.69"
print_info "  sudo ./ssh-port-2222-part2.sh"
print_info ""
print_info "=========================================================="
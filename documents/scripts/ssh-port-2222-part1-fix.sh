#!/bin/bash

# SSH Port Configuration - Part 1: Backup and Initial Setup (Ubuntu Fix)
# Run this script first, it will restart SSH service and notify you
# Usage: sudo ./ssh-port-2222-part1-fix.sh

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

print_info "SSH Port Configuration - Part 1: Backup and Setup (Ubuntu Fix)"
print_info "================================================================="

# Step 1: Backup current SSH configuration
print_info "Step 1: Backing up current SSH configuration..."
BACKUP_FILE="/etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"
cp /etc/ssh/sshd_config "$BACKUP_FILE"
print_status "SSH config backed up to: $BACKUP_FILE"

# Step 2: Create a clean SSH configuration with both ports
print_info "Step 2: Creating clean SSH configuration with both ports..."
cat > /tmp/new_ssh_config << 'EOF'
# This is the sshd server system-wide configuration file. See
# sshd_config(5) for more information.

# Include additional configuration files
Include /etc/ssh/sshd_config.d/*.conf

# SSH Ports - Configure both ports 22 and 2222
Port 22
Port 2222

# SSH Security Hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers maxvamp
KbdInteractiveAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Step 3: Replace the SSH configuration
print_info "Step 3: Replacing SSH configuration..."
mv /etc/ssh/sshd_config /etc/ssh/sshd_config.original
mv /tmp/new_ssh_config /etc/ssh/sshd_config
print_status "SSH configuration replaced"

# Step 4: Test SSH configuration syntax
print_info "Step 4: Testing SSH configuration syntax..."
if sshd -t; then
    print_status "SSH configuration syntax is valid"
else
    print_error "SSH configuration syntax error"
    # Restore backup
    mv /etc/ssh/sshd_config.original /etc/ssh/sshd_config
    exit 1
fi

# Step 5: Save state for Part 2
print_info "Step 5: Saving configuration state..."
cat > /tmp/ssh_config_state.txt << EOF
SSH_CONFIG_UPDATED=true
SSH_RESTARTED=false
BACKUP_FILE="$BACKUP_FILE"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_PART=1
ORIGINAL_CONFIG="/etc/ssh/sshd_config.original"
EOF
print_status "Configuration state saved"

# Step 6: Reload systemd daemon and restart SSH
print_info "Step 6: Reloading systemd daemon..."
systemctl daemon-reload
print_status "Systemd daemon reloaded"

print_info "Step 7: Restarting SSH service..."
systemctl restart ssh
if [[ $? -eq 0 ]]; then
    print_status "SSH service restarted successfully"
else
    print_error "Failed to restart SSH service"
    exit 1
fi

# Step 7: Mark SSH as restarted
echo "SSH_RESTARTED=true" > /tmp/ssh_config_state.txt

# Step 8: Display completion message and instructions
print_status "Part 1 completed successfully!"
print_warning "SSH service has been restarted"
print_info ""
print_info "================================================================="
print_info "SSH service has been restarted with new configuration."
print_info ""
print_info "IMPORTANT INSTRUCTIONS:"
print_info "1. You will be disconnected from this session"
print_info "2. Wait 10 seconds for SSH to fully restart"
print_info "3. Reconnect to SARK using: ssh maxvamp@192.168.68.69"
print_info "4. Run: sudo ./ssh-port-2222-part2-fix.sh"
print_info ""
print_info "Configuration backup: $BACKUP_FILE"
print_info "Resume state: /tmp/ssh_config_state.txt"
print_info "================================================================="

# Give user time to read the message
print_info "SSH service will disconnect you in 5 seconds..."
sleep 5
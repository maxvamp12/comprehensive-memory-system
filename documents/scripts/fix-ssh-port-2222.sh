#!/bin/bash

# SSH Port Configuration Script for SARK
# Configures SSH to run on port 2222 and persists across reboots
# Run this script on SARK (192.168.68.69) with sudo privileges

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
    print_error "This script must be run as root. Use: sudo $0"
    exit 1
fi

print_info "Starting SSH Port Configuration for SARK"
print_info "================================================"

# Backup original SSH config
print_info "Backing up original SSH configuration..."
if [[ -f /etc/ssh/sshd_config ]]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
    print_status "SSH config backed up to /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"
else
    print_error "SSH config file not found at /etc/ssh/sshd_config"
    exit 1
fi

# Configure SSH for port 2222
print_info "Configuring SSH for port 2222..."

# Enable port 2222 and disable port 22 (or keep both as backup)
sed -i 's/^#Port 22$/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^Port 22$/Port 2222/' /etc/ssh/sshd_config

# Add SSH hardening if not already present
print_info "Adding SSH security hardening..."

cat >> /etc/ssh/sshd_config << 'EOF'

# SSH Security Hardening for Vorta Backup
Port 2222
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

print_status "SSH security hardening added"

# Restart SSH service
print_info "Restarting SSH service..."
systemctl restart sshd

if [[ $? -eq 0 ]]; then
    print_status "SSH service restarted successfully"
else
    print_error "Failed to restart SSH service"
    exit 1
fi

# Verify SSH is listening on port 2222
print_info "Verifying SSH is listening on port 2222..."
sleep 2

if netstat -tlnp | grep -q ':2222.*LISTEN'; then
    print_status "SSH is successfully listening on port 2222"
else
    print_error "SSH is not listening on port 2222"
    print_error "Checking SSH status..."
    systemctl status sshd
    exit 1
fi

# Enable SSH to start on boot
print_info "Enabling SSH to start on boot..."
systemctl enable sshd
print_status "SSH service enabled for boot"

# Test SSH connectivity (optional)
print_info "Testing SSH connectivity..."
if timeout 5 nc -z localhost 2222; then
    print_status "Port 2222 is accessible"
else
    print_warning "Port 2222 connectivity test timed out, but service may be working"
fi

print_status "SSH configuration completed successfully!"
print_info "================================================"
print_info "SSH is now configured to run on port 2222"
print_info "Vorta should now be able to connect to 192.168.68.69:2222"
print_info "================================================"

# Display final status
print_info "Current SSH listening ports:"
netstat -tlnp | grep ':2222\|:22' | grep LISTEN || print_warning "No SSH ports found in LISTEN state"
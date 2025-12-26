#!/bin/bash

# SSH Port Configuration Script for Borg Operations
# Configures SSH to run on both port 22 and port 2222 for Vorta compatibility
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

print_info "Starting SSH Port Configuration for Borg Operations"
print_info "====================================================="

# Backup original SSH config
print_info "Backing up original SSH configuration..."
if [[ -f /etc/ssh/sshd_config ]]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
    print_status "SSH config backed up to /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"
else
    print_error "SSH config file not found at /etc/ssh/sshd_config"
    exit 1
fi

# Configure SSH for both ports 22 and 2222
print_info "Configuring SSH for ports 22 and 2222..."

# Create new SSH config with both ports
cat > /etc/ssh/sshd_config << 'EOF'
# SSH Configuration for Borg Operations
# Standard SSH on port 22
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

print_status "SSH configuration updated with dual ports"

# Restart SSH service
print_info "Restarting SSH service..."
systemctl restart sshd

if [[ $? -eq 0 ]]; then
    print_status "SSH service restarted successfully"
else
    print_error "Failed to restart SSH service"
    exit 1
fi

# Verify SSH is listening on both ports
print_info "Verifying SSH is listening on both ports..."
sleep 2

PORT_22_CHECK=$(netstat -tlnp 2>/dev/null | grep ':22.*LISTEN' | wc -l)
PORT_2222_CHECK=$(netstat -tlnp 2>/dev/null | grep ':2222.*LISTEN' | wc -l)

if [[ $PORT_22_CHECK -gt 0 ]]; then
    print_status "SSH is listening on port 22"
else
    print_warning "SSH is not listening on port 22"
fi

if [[ $PORT_2222_CHECK -gt 0 ]]; then
    print_status "SSH is listening on port 2222"
else
    print_error "SSH is not listening on port 2222"
    print_info "Checking SSH status..."
    systemctl status sshd
    exit 1
fi

# Enable SSH to start on boot
print_info "Enabling SSH to start on boot..."
systemctl enable sshd
print_status "SSH service enabled for boot"

print_status "SSH port configuration completed successfully!"
print_info "====================================================="
print_info "SSH is now configured to run on both ports:"
print_info "  - Port 22: Standard SSH access"
print_info "  - Port 2222: Borg operations (for Vorta)"
print_info "====================================================="
print_info "Vorta should now be able to connect to 192.168.68.69:2222"
print_info "====================================================="
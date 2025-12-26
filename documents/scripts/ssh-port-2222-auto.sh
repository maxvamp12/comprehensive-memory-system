#!/bin/bash

# SSH Port Configuration Script for Borg Operations
# Configures SSH to run on both port 22 and port 2222 for Vorta compatibility
# Run this script with sudo: sudo ./ssh-port-2222-auto.sh

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

print_info "Starting SSH Port Configuration for Borg Operations"
print_info "====================================================="

# Step 1: Backup current SSH configuration
print_info "Step 1: Backing up current SSH configuration..."
BACKUP_FILE="/etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"
cp /etc/ssh/sshd_config "$BACKUP_FILE"
print_status "SSH config backed up to: $BACKUP_FILE"

# Step 2: Add port 2222 to SSH config
print_info "Step 2: Adding port 2222 to SSH configuration..."
# Check if port 2222 already exists
if ! grep -q "^Port 2222" /etc/ssh/sshd_config; then
    # Find the Port 22 line and add port 2222 after it
    if grep -q "^Port 22" /etc/ssh/sshd_config; then
        sed -i '/^Port 22$/a Port 2222' /etc/ssh/sshd_config
        print_status "Added port 2222 after Port 22"
    else
        # If no Port 22 line found, add both ports
        echo -e "Port 22\nPort 2222" > /tmp/ssh_ports.txt
        # Insert the ports at the beginning of the file
        sed -i '1r /tmp/ssh_ports.txt' /etc/ssh/sshd_config
        rm /tmp/ssh_ports.txt
        print_status "Added both ports 22 and 2222"
    fi
else
    print_warning "Port 2222 already configured"
fi

# Step 3: Restart SSH service
print_info "Step 3: Restarting SSH service..."
systemctl restart sshd
if [[ $? -eq 0 ]]; then
    print_status "SSH service restarted successfully"
else
    print_error "Failed to restart SSH service"
    exit 1
fi

# Step 4: Verify SSH is listening on both ports
print_info "Step 4: Verifying SSH is listening on both ports..."
sleep 2

PORT_22_LISTENING=$(netstat -tlnp 2>/dev/null | grep ':22.*LISTEN' | wc -l)
PORT_2222_LISTENING=$(netstat -tlnp 2>/dev/null | grep ':2222.*LISTEN' | wc -l)

if [[ $PORT_22_LISTENING -gt 0 ]]; then
    print_status "SSH is listening on port 22"
else
    print_error "SSH is not listening on port 22"
fi

if [[ $PORT_2222_LISTENING -gt 0 ]]; then
    print_status "SSH is listening on port 2222"
else
    print_error "SSH is not listening on port 2222"
    exit 1
fi

# Step 5: Test SSH connection to port 2222
print_info "Step 5: Testing SSH connection to port 2222..."
if timeout 5 nc -z localhost 2222; then
    print_status "Port 2222 is accessible"
else
    print_warning "Port 2222 connectivity test timed out, but service may be working"
fi

# Step 6: Enable SSH auto-start on boot
print_info "Step 6: Enabling SSH auto-start on boot..."
systemctl enable sshd
print_status "SSH service enabled for boot"

# Step 7: Verify SSH configuration
print_info "Step 7: Verifying SSH configuration..."
echo "Current SSH configuration:"
grep -E "^Port|^#Port" /etc/ssh/sshd_config
echo ""

print_status "SSH port configuration completed successfully!"
print_info "====================================================="
print_info "SSH is now configured to run on both ports:"
print_info "  - Port 22: Standard SSH access"
print_info "  - Port 2222: Borg operations (for Vorta)"
print_info "====================================================="
print_info "Next steps:"
print_info "1. Test SSH connection: ssh -p 2222 maxvamp@192.168.68.69"
print_info "2. If successful, restart Vorta on FLYNN"
print_info "3. Vorta should now be able to connect to 192.168.68.69:2222"
print_info "====================================================="

# Final verification
print_info "Final verification - Testing SSH connection to port 2222..."
if ssh -p 2222 maxvamp@localhost "echo 'SSH connection to port 2222 successful'" 2>/dev/null; then
    print_status "✓ SSH connection to port 2222 successful!"
    print_info "Vorta should now work with: ssh://maxvamp@192.168.68.69:2222/mnt/borg-backup/borg-repo"
else
    print_error "✗ SSH connection to port 2222 failed"
    print_info "Check SSH service status: systemctl status sshd"
fi
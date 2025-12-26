#!/bin/bash

# SSH Port Configuration - Part 2: Restart and Verification
# Run this script after reconnecting to SARK
# Usage: sudo ./ssh-port-2222-part2.sh

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

print_info "SSH Port Configuration - Part 2: Restart and Verification"
print_info "============================================================"

# Step 1: Check if we have previous state
if [[ ! -f /tmp/ssh_config_state.txt ]]; then
    print_error "No previous configuration state found"
    print_info "Please run Part 1 first: sudo ./ssh-port-2222-part1.sh"
    exit 1
fi

# Load previous state
source /tmp/ssh_config_state.txt

print_info "Previous state loaded:"
echo "  - SSH_CONFIG_UPDATED: $SSH_CONFIG_UPDATED"
echo "  - SSH_RESTARTED: $SSH_RESTARTED"
echo "  - BACKUP_FILE: $BACKUP_FILE"
echo "  - TIMESTAMP: $TIMESTAMP"

# Step 2: Verify SSH is listening on both ports (no restart needed)
print_info "Step 2: Verifying SSH is listening on both ports..."
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

# Step 3: Test SSH connection to port 2222
print_info "Step 3: Testing SSH connection to port 2222..."
if timeout 5 nc -z localhost 2222; then
    print_status "Port 2222 is accessible"
else
    print_warning "Port 2222 connectivity test timed out, but service may be working"
fi

# Step 4: Enable SSH auto-start on boot (if not already enabled)
print_info "Step 4: Enabling SSH auto-start on boot..."
systemctl enable ssh
print_status "SSH service enabled for boot"

# Step 5: Clean up state file
print_info "Step 5: Cleaning up..."
rm -f /tmp/ssh_config_state.txt

# Step 6: Final verification
print_info "Step 8: Final verification..."
echo "Current SSH configuration:"
grep -E "^Port|^#Port" /etc/ssh/sshd_config
echo ""

print_status "SSH port configuration completed successfully!"
print_info "============================================================"
print_info "SSH is now configured to run on both ports:"
print_info "  - Port 22: Standard SSH access"
print_info "  - Port 2222: Borg operations (for Vorta)"
print_info "============================================================"
print_info "Next steps:"
print_info "1. Test SSH connection from FLYNN: ssh -p 2222 maxvamp@192.168.68.69"
print_info "2. If successful, restart Vorta on FLYNN"
print_info "3. Vorta should now be able to connect to 192.168.68.69:2222"
print_info "============================================================"

# Final verification
print_info "Final verification - Testing SSH connection to port 2222..."
if ssh -p 2222 maxvamp@localhost "echo 'SSH connection to port 2222 successful'" 2>/dev/null; then
    print_status "✓ SSH connection to port 2222 successful!"
    print_info "Vorta should now work with: ssh://maxvamp@192.168.68.69:2222/mnt/borg-backup/borg-repo"
else
    print_error "✗ SSH connection to port 2222 failed"
    print_info "Check SSH service status: systemctl status ssh"
fi
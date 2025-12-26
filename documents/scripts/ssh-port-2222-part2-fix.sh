#!/bin/bash

# SSH Port Configuration - Part 2: Verification and Fix
# Run this script after reconnecting to SARK
# Usage: sudo ./ssh-port-2222-part2-fix.sh

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

print_info "SSH Port Configuration - Part 2: Verification and Fix"
print_info "================================================================="

# Step 1: Check if we have previous state
if [[ ! -f /tmp/ssh_config_state.txt ]]; then
    print_error "No previous configuration state found"
    print_info "Please run Part 1 first: sudo ./ssh-port-2222-part1-fix.sh"
    exit 1
fi

# Load previous state
source /tmp/ssh_config_state.txt

print_info "Previous state loaded:"
echo "  - SSH_CONFIG_UPDATED: $SSH_CONFIG_UPDATED"
echo "  - SSH_RESTARTED: $SSH_RESTARTED"
echo "  - BACKUP_FILE: $BACKUP_FILE"
echo "  - TIMESTAMP: $TIMESTAMP"

# Step 2: Test port connectivity
print_info "Step 2: Testing port connectivity..."
sleep 2

PORT_22_ACCESSIBLE=false
PORT_2222_ACCESSIBLE=false

# Test port 22
if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/22" 2>/dev/null; then
    print_status "Port 22 is accessible"
    PORT_22_ACCESSIBLE=true
else
    print_error "Port 22 is not accessible"
fi

# Test port 2222
if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/2222" 2>/dev/null; then
    print_status "Port 2222 is accessible"
    PORT_2222_ACCESSIBLE=true
else
    print_error "Port 2222 is not accessible"
fi

# Step 3: If port 2222 is not accessible, fix the configuration
if [[ "$PORT_2222_ACCESSIBLE" == "false" ]]; then
    print_warning "Port 2222 is not accessible, fixing configuration..."
    
    # Create a new SSH configuration with proper port handling
    print_info "Creating fixed SSH configuration..."
    cat > /tmp/fixed_ssh_config << 'EOF'
# This is the sshd server system-wide configuration file. See
# sshd_config(5) for more information.

# Include additional configuration files
Include /etc/ssh/sshd_config.d/*.conf

# SSH Port - Use only one port line to avoid conflicts
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

    # Backup current config and replace with fixed version
    mv /etc/ssh/sshd_config /etc/ssh/sshd_config.broken
    mv /tmp/fixed_ssh_config /etc/ssh/sshd_config
    
    # Test configuration syntax
    if sshd -t; then
        print_status "Fixed SSH configuration syntax is valid"
        
        # Restart SSH service
        print_info "Restarting SSH service with fixed configuration..."
        systemctl restart ssh
        
        sleep 2
        
        # Test port 2222 again
        if timeout 2 bash -c "exec 3<>/dev/tcp/localhost/2222" 2>/dev/null; then
            print_status "Port 2222 is now accessible after fix"
            PORT_2222_ACCESSIBLE=true
        else
            print_error "Port 2222 is still not accessible after fix"
        fi
    else
        print_error "Fixed SSH configuration syntax error"
        mv /etc/ssh/sshd_config.broken /etc/ssh/sshd_config
        exit 1
    fi
fi

# Step 4: Final verification
print_info "Step 4: Final verification..."
sleep 1

if [[ "$PORT_22_ACCESSIBLE" == "true" ]]; then
    print_status "✓ Port 22: Accessible (standard SSH)"
else
    print_error "✗ Port 22: Not accessible"
fi

if [[ "$PORT_2222_ACCESSIBLE" == "true" ]]; then
    print_status "✓ Port 2222: Accessible (Borg operations)"
else
    print_error "✗ Port 2222: Not accessible"
fi

# Step 5: Clean up state file
print_info "Step 5: Cleaning up..."
rm -f /tmp/ssh_config_state.txt

# Step 6: Final SSH connection test
print_info "Step 6: Final SSH connection test..."
if ssh -p 2222 maxvamp@localhost "echo 'SSH connection to port 2222 successful'" 2>/dev/null; then
    print_status "✓ SSH connection to port 2222 successful!"
    print_info "Vorta should now work with: ssh://maxvamp@192.168.68.69:2222/mnt/borg-backup/borg-repo"
else
    print_error "✗ SSH connection to port 2222 failed"
    print_info "Check SSH service status: systemctl status ssh"
fi

print_status "SSH port configuration verification completed!"
print_info "================================================================="
print_info "SSH status summary:"
print_info "  - Port 22: $([[ "$PORT_22_ACCESSIBLE" == "true" ]] && echo "✓ Accessible" || echo "✗ Not accessible")"
print_info "  - Port 2222: $([[ "$PORT_2222_ACCESSIBLE" == "true" ]] && echo "✓ Accessible" || echo "✗ Not accessible")"
print_info "================================================================="
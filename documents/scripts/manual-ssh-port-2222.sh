#!/bin/bash

# Manual SSH Port Configuration
# Simple script to add port 2222 to SSH configuration

echo "Configuring SSH for both ports 22 and 2222..."

# Backup current config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# Add port 2222 to SSH config if not already present
if ! sudo grep -q "^Port 2222" /etc/ssh/sshd_config; then
    # Enable port 2222 (if commented out)
    sudo sed -i 's/^#Port 22$/Port 2222/' /etc/ssh/sshd_config
    # Add port 2222 if it doesn't exist
    sudo sed -i '/^Port 22$/a Port 2222' /etc/ssh/sshd_config 2>/dev/null || {
        # If no Port 22 line found, just add port 2222
        echo "Port 2222" | sudo tee -a /etc/ssh/sshd_config
    }
fi

# Restart SSH service
sudo systemctl restart sshd

echo "SSH configured for ports 22 and 2222"
echo "Test with: ssh -p 2222 maxvamp@192.168.68.69"
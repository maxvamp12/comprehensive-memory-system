# CLU Memory System Backup Integration Guide

This guide explains how to integrate your memory system data from CLU into your existing BORG backup system on SARK.

## Overview

Your BORG backup system on SARK (192.168.68.69) currently backs up local data. We'll extend it to also backup the memory system data from CLU (192.168.68.71) using SSHFS to mount the remote data.

## Prerequisites

### On SARK (192.168.68.69)

1. **SSH Access to CLU**: Ensure you can SSH to CLU without password
2. **SSHFS**: Install sshfs for mounting remote filesystem
3. **fuse Group**: User must be in fuse group

```bash
# Install sshfs
sudo apt-get install sshfs

# Add user to fuse group
sudo usermod -a -G fuse maxvamp

# Logout and login to apply group changes
```

### On CLU (192.168.100.11)

1. **SSH Server**: SSH server must be running
2. **Passwordless SSH**: Configure SSH key-based authentication
3. **Memory System Data**: Ensure `/opt/memory-system/data` exists

```bash
# Generate SSH key if needed
ssh-keygen -t rsa -b 4096

# Copy SSH key to CLU
ssh-copy-id maxvamp@192.168.68.71

# Test SSH connection
ssh maxvamp@192.168.68.71 "ls -la /opt/memory-system"
```

## Integration Steps

### Step 1: Install Required Software on SARK

```bash
# Install sshfs
sudo apt-get install sshfs

# Add user to fuse group
sudo usermod -a -G fuse maxvamp

# Logout and login (or reboot)
```

### Step 2: Configure SSH Access to CLU

```bash
# Test SSH access
ssh maxvamp@192.168.100.11 "echo 'SSH access works'"

# Ensure memory system data exists
ssh maxvamp@192.168.100.11 "ls -la /opt/memory-system"
```

### Step 3: Modify Your Existing Backup Configuration

Edit `/home/maxvamp/borg-docker/backup-config.conf` and add:

```bash
# Add CLU memory system data to backup sources
BACKUP_SOURCES=(
    "/home/maxvamp"
    "/etc"
    "/root"
    "/opt"
    "/usr/local"
    "/var/lib/docker/volumes"
    # Add CLU memory system data
    "/backup-source/opt/memory-system"
)

# Add CLU-specific exclusions
EXCLUDE_PATTERNS=(
    # ... existing patterns ...
    
    # CLU-specific exclusions
    "/backup-source/proc"
    "/backup-source/sys"
    "/backup-source/dev"
    "/backup-source/run"
    "/backup-source/tmp"
    "/backup-source/var/tmp"
    "/backup-source/home/maxvamp/.cache"
    "/backup-source/home/maxvamp/.local/share/Trash"
)
```

### Step 4: Create Extended Backup Script

Create `/home/maxvamp/borg-docker/backup-clu.sh` with the script provided.

### Step 5: Test the Integration

```bash
# Test CLU connectivity
cd /home/maxvamp/borg-docker
./backup-clu.sh --skip-clu  # Test main backup first

# Test full backup with CLU
./backup-clu.sh
```

## Usage

### Manual Backup with CLU Data

```bash
# Run backup with CLU data included
cd /home/maxvamp/borg-docker
./backup-clu.sh
```

### Backup Only Local Data (Skip CLU)

```bash
# Skip CLU data backup
cd /home/maxvamp/borg-docker
./backup-clu.sh --skip-clu
```

### Automated Backup

Modify your cron job to use the new script:

```bash
# Edit crontab
crontab -e

# Change from:
# 0 2 * * * /home/maxvamp/borg-docker/backup.sh

# To:
# 0 2 * * * /home/maxvamp/borg-docker/backup-clu.sh
```

## What Gets Backed Up from CLU

### Memory System Data
```
/opt/memory-system/
├── data/
│   ├── memories/           # Memory JSON files
│   ├── embeddings/         # Vector embeddings
│   ├── indexes/           # Search indexes
│   └── logs/              # Application logs
├── backups/               # Backup files
└── ssl/                   # SSL certificates (if used)
```

### Backup Archive Names
- **Main backup**: `$(hostname)-$(date)`
- **CLU memory data**: `CLU-memory-system-$(date)`

## Monitoring

### Check Backup Logs

```bash
# View main backup log
tail -f /home/maxvamp/borg-docker/backup.log

# View CLU extension log
tail -f /home/maxvamp/borg-docker/backup-clu.log
```

### Verify CLU Data in Backups

```bash
# List all backups
cd /home/maxvamp/borg-docker
./restore.sh
# Choose option 1: List all available backups

# Check CLU backup size
docker run --rm -e BORG_PASSPHRASE="Mtbf12@" \
  -v /mnt/borg-backup:/mnt/borg-backup \
  borg-restore \
  borg info /mnt/borg-backup/borg-repo | grep "CLU-memory-system"
```

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connectivity
ssh maxvamp@192.168.100.11 "echo 'Test successful'"

# Check SSH keys
ssh -v maxvamp@192.168.100.11

# Fix SSH permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
```

### SSHFS Mount Issues

```bash
# Check if user is in fuse group
groups | grep fuse

# Check fuse module
lsmod | grep fuse

# Load fuse module if needed
sudo modprobe fuse
```

### Permission Issues

```bash
# Fix SSH key permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa

# Fix CLU directory permissions
ssh maxvamp@192.168.68.71 "chmod -R 755 /opt/memory-system"
```

### Backup Issues

```bash
# Check backup log
tail -100 /home/maxvamp/borg-docker/backup-clu.log

# Test manual mount
mkdir -p /tmp/clu-test
sshfs maxvamp@192.168.100.11:/opt/memory-system /tmp/clu-test -o ro
ls -la /tmp/clu-test
fusermount -u /tmp/clu-test
```

## Performance Considerations

### Network Impact
- **First backup**: May take longer (full data transfer)
- **Subsequent backups**: Fast (only changed files)
- **Network usage**: Depends on data size and changes

### Storage Impact
- **CLU data size**: Monitor memory system growth
- **Backup size**: Will increase with CLU data included
- **Retention policy**: Existing retention applies to all data

### Optimization Tips
1. **Run during off-peak hours** when CLU is less busy
2. **Monitor network usage** during backup
3. **Check disk space** on backup drive
4. **Verify backups** regularly

## Security Considerations

### SSH Security
- Use SSH key authentication (passwordless)
- Restrict SSH access to backup operations only
- Regularly rotate SSH keys
- Monitor SSH access logs

### Data Security
- CLU data is backed up encrypted by BORG
- Ensure SSH keys are properly secured
- Regular backup verification
- Access control to backup repository

## Backup Strategy

### Daily Backups
- **Main backup**: All SARK data
- **CLU data**: Memory system data only
- **Retention**: 7 days, 4 weeks, 6 months

### Weekly Verification
- Verify CLU backup integrity
- Test restore procedure
- Check network connectivity
- Monitor backup sizes

### Monthly Maintenance
- Review backup performance
- Update retention if needed
- Check security settings
- Test disaster recovery

## Files Modified

### On SARK (192.168.68.69)

1. **`/home/maxvamp/borg-docker/backup-config.conf`**
   - Add CLU memory system data to sources
   - Add CLU-specific exclusions

2. **`/home/maxvamp/borg-docker/backup-clu.sh`** (New file)
   - Extended backup script with CLU support
   - SSHFS mounting and CLU data backup

3. **Cron job modification**
   - Update to use new backup script

### Testing Commands

```bash
# Test SSH access
ssh maxvamp@192.168.68.71 "ls -la /opt/memory-system"

# Test SSHFS mount
mkdir -p /tmp/test-mount
sshfs maxvamp@192.168.100.11:/opt/memory-system /tmp/test-mount -o ro
ls -la /tmp/test-mount
fusermount -u /tmp/test-mount

# Test backup script
cd /home/maxvamp/borg-docker
./backup-clu.sh --skip-clu
./backup-clu.sh
```

This integration ensures your memory system data from CLU is safely backed up along with all your SARK data in a single backup job.
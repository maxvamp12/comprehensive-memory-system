#!/bin/bash

# Alternative approach: Create new repository with longer passphrase
# and migrate existing data

echo "Creating new borg repository with longer passphrase..."

# Create new repository directory
mkdir -p /mnt/borg-backup/borg-repo-new

# Set new passphrase
export BORG_PASSPHRASE="TazKitty12@"

# Initialize new repository
docker run --rm \
    -e BORG_PASSPHRASE="TazKitty12@" \
    -v /mnt/borg-backup:/mnt \
    borg-restore \
    borg init --encryption=repokey /mnt/borg-repo-new

if [ $? -eq 0 ]; then
    echo "New repository created successfully"
    
    # List archives from old repository
    echo "Listing archives from old repository:"
    echo "Mtbf12@" | docker run -i --rm -v /mnt/borg-backup:/mnt borg-restore borg list /mnt/borg-repo
    
    echo "New repository is ready with passphrase: TazKitty12@"
    echo "You can now configure Vorta to use this new repository"
else
    echo "Failed to create new repository"
fi
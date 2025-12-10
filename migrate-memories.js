const fs = require('fs').promises;
const path = require('path');
const StorageManager = require('./core/storage-manager');

console.log('=== MEMORY MIGRATION SCRIPT ===\n');

async function migrateMemories() {
  const storage = new StorageManager();
  const migrations = [];
  const stats = {
    totalMemories: 0,
    migratedMemories: 0,
    backupErrors: 0,
    parseErrors: 0,
    unchangedMemories: 0
  };

  console.log('Starting memory migration process...\n');
  console.log('This will fix corrupted memories while preserving original data.\n');

  try {
    // Create backup directory
    const backupDir = path.join(storage.dataDir, 'backups', migrationTimestamp());
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`✅ Created backup directory: ${backupDir}\n`);

    // Get all memory files
    const memoriesDir = path.join(storage.dataDir, 'memories');
    const memoryFiles = await fs.readdir(memoriesDir);
    
    console.log(`Found ${memoryFiles.length} memory files to migrate...\n`);

    for (const file of memoryFiles) {
      if (file.endsWith('.json')) {
        const memoryId = file.replace('.json', '');
        const memoryPath = path.join(memoriesDir, file);
        
        try {
          // Create backup
          const backupPath = path.join(backupDir, file);
          const memoryData = await fs.readFile(memoryPath, 'utf8');
          await fs.writeFile(backupPath, memoryData);
          
          // Parse memory
          const memory = JSON.parse(memoryData);
          stats.totalMemories++;
          
          let hasChanges = false;
          const originalMemory = JSON.parse(memoryData); // Keep original for comparison
          
          // Fix categories field
          if (memory.categories) {
            // Fix categories array
            if (Array.isArray(memory.categories)) {
              // Clean up null/undefined values
              const originalCategories = [...memory.categories];
              memory.categories = memory.categories.filter(cat => 
                cat !== null && cat !== undefined && cat !== ''
              );
              
              // Normalize categories (trim whitespace, lowercase)
              const normalizedCategories = memory.categories.map(cat => {
                const normalized = String(cat).trim().toLowerCase();
                return normalized;
              });
              
              // Remove duplicates
              const uniqueCategories = [...new Set(normalizedCategories)];
              
              if (JSON.stringify(originalCategories) !== JSON.stringify(memory.categories) ||
                  JSON.stringify(memory.categories) !== JSON.stringify(uniqueCategories)) {
                memory.categories = uniqueCategories;
                hasChanges = true;
              }
            } else {
              // categories is not an array, convert it
              const categoryValue = memory.categories;
              memory.categories = [String(categoryValue).trim().toLowerCase()];
              hasChanges = true;
            }
          } else if (memory.category) {
            // Old format - convert string category to array
            memory.categories = [String(memory.category).trim().toLowerCase()];
            delete memory.category;
            hasChanges = true;
          } else {
            // No categories field, add default
            memory.categories = ['general'];
            hasChanges = true;
          }
          
          // Ensure categories is not empty
          if (memory.categories.length === 0) {
            memory.categories = ['general'];
            hasChanges = true;
          }
          
          // Fix timestamp if missing or invalid
          if (!memory.timestamp || isNaN(new Date(memory.timestamp).getTime())) {
            memory.timestamp = new Date().toISOString();
            hasChanges = true;
          }
          
          // Fix content if missing
          if (!memory.content) {
            memory.content = '[Migrated memory - content was missing]';
            hasChanges = true;
          }
          
          // Add migration metadata
          memory.migrated = true;
          memory.migrationDate = new Date().toISOString();
          
          if (hasChanges) {
            // Write updated memory
            await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
            migrations.push({
              id: memoryId,
              changes: getChangesSummary(originalMemory, memory),
              backupPath: backupPath
            });
            stats.migratedMemories++;
            console.log(`✅ Migrated memory: ${memoryId}`);
          } else {
            stats.unchangedMemories++;
            console.log(`⏭️  Memory unchanged: ${memoryId}`);
          }
          
        } catch (error) {
          stats.backupErrors++;
          console.log(`❌ Backup failed for ${memoryId}: ${error.message}`);
        }
      }
    }

    // Print migration summary
    console.log('\n=== MIGRATION SUMMARY ===\n');
    console.log(`Total memories processed: ${stats.totalMemories}`);
    console.log(`Memories migrated: ${stats.migratedMemories}`);
    console.log(`Memories unchanged: ${stats.unchangedMemories}`);
    console.log(`Backup errors: ${stats.backupErrors}`);
    console.log(`Parse errors: ${stats.parseErrors}`);
    
    if (migrations.length > 0) {
      console.log('\n=== MIGRATED MEMORIES ===\n');
      migrations.forEach(migration => {
        console.log(`📝 ${migration.id}:`);
        migration.changes.forEach(change => {
          console.log(`  - ${change}`);
        });
        console.log(`  🔒 Backup: ${migration.backupPath}`);
        console.log('');
      });
    }
    
    console.log('\n✅ Memory migration complete!');
    console.log('\n📋 Next steps:');
    console.log('   - Review the migrated memories for correctness');
    console.log('   - Run the validation script again to confirm all issues are resolved');
    console.log('   - Run the test suite to ensure no regression in functionality');
    
  } catch (error) {
    console.log('❌ Error during migration:', error.message);
    throw error;
  }
}

function migrationTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

function getChangesSummary(original, updated) {
  const changes = [];
  
  // Check categories
  if (original.categories !== updated.categories) {
    if (!original.categories && updated.categories) {
      changes.push(`Added categories: ${updated.categories.join(', ')}`);
    } else if (Array.isArray(original.categories) && Array.isArray(updated.categories)) {
      if (original.categories.length !== updated.categories.length) {
        changes.push(`Normalized categories array`);
      }
      if (JSON.stringify(original.categories.map(c => String(c).trim().toLowerCase())) !== 
          JSON.stringify(updated.categories.map(c => String(c).trim().toLowerCase()))) {
        changes.push(`Normalized category values`);
      }
    }
  }
  
  // Check category field removal
  if (original.category && !updated.category) {
    changes.push(`Converted old category field to categories array`);
  }
  
  // Check timestamp
  if (!original.timestamp && updated.timestamp) {
    changes.push(`Added missing timestamp`);
  }
  
  // Check content
  if (!original.content && updated.content) {
    changes.push(`Added missing content`);
  }
  
  // Check migration metadata
  if (!original.migrated && updated.migrated) {
    changes.push(`Added migration metadata`);
  }
  
  return changes.length > 0 ? changes : ['No significant changes'];
}

// Run the migration
migrateMemories().catch(console.error);
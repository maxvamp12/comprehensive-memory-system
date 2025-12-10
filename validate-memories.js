const fs = require('fs').promises;
const path = require('path');
const StorageManager = require('./core/storage-manager');

console.log('=== MEMORY VALIDATION SCRIPT ===\n');

async function validateMemories() {
  const storage = new StorageManager();
  const issues = [];
  const stats = {
    totalMemories: 0,
    validMemories: 0,
    corruptedMemories: 0,
    missingCategories: 0,
    stringCategories: 0,
    nullCategories: 0,
    emptyCategories: 0,
    mixedCaseCategories: 0,
    whitespaceCategories: 0,
    duplicateMemories: 0,
    missingContent: 0,
    missingTimestamp: 0
  };

  console.log('Scanning all memories for format issues...\n');

  try {
    // Get all memory files
    const memoriesDir = path.join(storage.dataDir, 'memories');
    const memoryFiles = await fs.readdir(memoriesDir);
    
    console.log(`Found ${memoryFiles.length} memory files to validate...\n`);

    for (const file of memoryFiles) {
      if (file.endsWith('.json')) {
        const memoryId = file.replace('.json', '');
        try {
          const memoryPath = path.join(memoriesDir, file);
          const memoryData = await fs.readFile(memoryPath, 'utf8');
          const memory = JSON.parse(memoryData);
          
          stats.totalMemories++;
          
          // Check for required fields
          if (!memory.content) {
            issues.push({
              id: memoryId,
              issue: 'Missing content field',
              severity: 'high'
            });
            stats.missingContent++;
          }
          
          if (!memory.timestamp) {
            issues.push({
              id: memoryId,
              issue: 'Missing timestamp field',
              severity: 'high'
            });
            stats.missingTimestamp++;
          }
          
          // Check categories
          if (!memory.categories && !memory.category) {
            issues.push({
              id: memoryId,
              issue: 'Missing both categories and category fields',
              severity: 'high'
            });
            stats.missingCategories++;
          } else if (memory.categories) {
            // Check categories array format
            if (!Array.isArray(memory.categories)) {
              issues.push({
                id: memoryId,
                issue: `Categories is not an array: ${typeof memory.categories}`,
                severity: 'high'
              });
              stats.stringCategories++;
            } else {
              // Check for empty categories
              if (memory.categories.length === 0) {
                issues.push({
                  id: memoryId,
                  issue: 'Categories array is empty',
                  severity: 'medium'
                });
                stats.emptyCategories++;
              }
              
              // Check for null/undefined categories
              const hasNullCategories = memory.categories.some(cat => cat === null || cat === undefined);
              if (hasNullCategories) {
                issues.push({
                  id: memoryId,
                  issue: 'Categories array contains null/undefined values',
                  severity: 'medium'
                });
                stats.nullCategories++;
              }
              
              // Check for mixed case categories
              const hasMixedCase = memory.categories.some(cat => 
                cat && cat !== cat.toLowerCase()
              );
              if (hasMixedCase) {
                issues.push({
                  id: memoryId,
                  issue: 'Categories contain mixed case',
                  severity: 'low'
                });
                stats.mixedCaseCategories++;
              }
              
              // Check for whitespace in categories
              const hasWhitespace = memory.categories.some(cat => 
                cat && cat.includes(' ')
              );
              if (hasWhitespace) {
                issues.push({
                  id: memoryId,
                  issue: 'Categories contain whitespace',
                  severity: 'low'
                });
                stats.whitespaceCategories++;
              }
            }
          } else if (memory.category) {
            // Old format - string category
            issues.push({
              id: memoryId,
              issue: 'Using old string category format instead of array',
              severity: 'medium'
            });
            stats.stringCategories++;
          }
          
          // Check for duplicate content (basic check)
          // This is a simplified check - in production you might want more sophisticated duplicate detection
          
        } catch (error) {
          issues.push({
            id: memoryId,
            issue: `Failed to parse memory file: ${error.message}`,
            severity: 'high'
          });
          stats.corruptedMemories++;
        }
      }
    }

    // Calculate valid memories
    stats.validMemories = stats.totalMemories - stats.corruptedMemories;

    // Print summary statistics
    console.log('=== VALIDATION SUMMARY ===\n');
    console.log(`Total memories scanned: ${stats.totalMemories}`);
    console.log(`Valid memories: ${stats.validMemories}`);
    console.log(`Corrupted memories: ${stats.corruptedMemories}`);
    
    if (stats.missingCategories > 0) {
      console.log(`Memories with missing categories: ${stats.missingCategories}`);
    }
    if (stats.stringCategories > 0) {
      console.log(`Memories with old string category format: ${stats.stringCategories}`);
    }
    if (stats.nullCategories > 0) {
      console.log(`Memories with null/undefined categories: ${stats.nullCategories}`);
    }
    if (stats.emptyCategories > 0) {
      console.log(`Memories with empty categories: ${stats.emptyCategories}`);
    }
    if (stats.mixedCaseCategories > 0) {
      console.log(`Memories with mixed case categories: ${stats.mixedCaseCategories}`);
    }
    if (stats.whitespaceCategories > 0) {
      console.log(`Memories with whitespace in categories: ${stats.whitespaceCategories}`);
    }
    if (stats.missingContent > 0) {
      console.log(`Memories missing content field: ${stats.missingContent}`);
    }
    if (stats.missingTimestamp > 0) {
      console.log(`Memories missing timestamp field: ${stats.missingTimestamp}`);
    }

    // Print detailed issues
    if (issues.length > 0) {
      console.log('\n=== DETAILED ISSUES FOUND ===\n');
      
      const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
      const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium');
      const lowSeverityIssues = issues.filter(issue => issue.severity === 'low');
      
      if (highSeverityIssues.length > 0) {
        console.log(`🔴 HIGH SEVERITY ISSUES (${highSeverityIssues.length}):`);
        highSeverityIssues.forEach(issue => {
          console.log(`  - ${issue.id}: ${issue.issue}`);
        });
      }
      
      if (mediumSeverityIssues.length > 0) {
        console.log(`\n🟡 MEDIUM SEVERITY ISSUES (${mediumSeverityIssues.length}):`);
        mediumSeverityIssues.forEach(issue => {
          console.log(`  - ${issue.id}: ${issue.issue}`);
        });
      }
      
      if (lowSeverityIssues.length > 0) {
        console.log(`\n🟢 LOW SEVERITY ISSUES (${lowSeverityIssues.length}):`);
        lowSeverityIssues.forEach(issue => {
          console.log(`  - ${issue.id}: ${issue.issue}`);
        });
      }
    } else {
      console.log('\n✅ No issues found in memory storage!');
    }

    // Recommendations
    console.log('\n=== RECOMMENDATIONS ===\n');
    
    if (stats.stringCategories > 0 || stats.missingCategories > 0 || stats.nullCategories > 0) {
      console.log('📋 Run memory migration script to fix existing corrupted memories');
    }
    
    if (stats.mixedCaseCategories > 0 || stats.whitespaceCategories > 0) {
      console.log('📋 Consider normalizing category case and trimming whitespace');
    }
    
    if (stats.corruptedMemories > 0) {
      console.log('📋 Review corrupted memories for potential data recovery');
    }
    
    console.log('\n✅ Memory validation complete!');

  } catch (error) {
    console.log('❌ Error during validation:', error.message);
    throw error;
  }
}

// Run the validation
validateMemories().catch(console.error);
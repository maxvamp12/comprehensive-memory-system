# COMPREHENSIVE MEMORY SYSTEM CONSTITUTION

## FILE ORGANIZATION PRINCIPLES

### Primary Directive
**ALL** markdown files and AI-generated shell scripts must be written to the `documents/` folder located in this home directory. No exceptions unless explicitly changed via constitutional amendment.

### AI File Management Responsibilities
The AI system is responsible for organizing files based on document type and purpose:

#### BMAD Project Documentation Separation
- **ALL documents created via BMAD processes** (specifications, plans, tasks, project-related documentation) must be written to the `docs/` folder
- **General documentation, session summaries, context files** must be written to the `documents/` folder
- BMAD documentation types include: project specifications, technical architecture plans, implementation roadmaps, task breakdowns, user stories, project management documentation, development workflows, system design documents, API specifications, database schemas, deployment documentation
- AI must determine document type and route to appropriate folder based on content purpose

#### 1. Context-Based Grouping
- Create logical subfolders based on project context, domains, or subject areas
- Use clear, descriptive folder names that reflect content purpose
- Maintain consistent hierarchy across similar document types

#### 2. Type-Based Grouping  
- Group files by document type (workflows, agents, configurations, etc.)
- Create standardized folder structures for common document types
- Ensure related files are co-located for easy access

#### 3. Hierarchical Organization
- Maintain clear parent-child relationships between folders
- Avoid overly deep folder structures (max 3-4 levels deep)
- Balance specificity with accessibility

#### 4. Naming Conventions
- Use descriptive, meaningful filenames
- Apply consistent naming patterns across similar documents
- Include version numbers or dates when relevant for temporal documents

### Implementation Standards

#### New Documents Classification
- BMAD-generated project documentation → `docs/` folder (BMAD processes create subfolders as needed)
- General documentation, session summaries, context files → `documents/` folder
- AI must determine document type and route to appropriate folder based on content purpose
- Files should be organized to minimize root directory clutter

#### Existing Files
- Current root directory files may be relocated to appropriate `documents/` subfolders
- Relocation should maintain document relationships and accessibility
- Historical context should be preserved during reorganization

#### Shell Scripts
- All AI-generated shell scripts must be placed in `documents/scripts/` or relevant subfolder
- Scripts should be organized by purpose (setup, configuration, utilities, etc.)
- Include descriptive headers in scripts for maintenance purposes

### Governance
- This constitution may be amended only through explicit consensus
- Changes should be documented with revision history
- Maintainers should strive to uphold these organizational principles

### Purpose
This constitution ensures:
- Consistent file organization across the project lifecycle
- Reduced root directory clutter through systematic categorization
- Enhanced discoverability through logical grouping
- Scalable structure that accommodates project growth
- Clear separation between BMAD project documentation and general documentation

---
*Established: December 22, 2025*
*Amendment Process: Requires explicit consensus for changes*
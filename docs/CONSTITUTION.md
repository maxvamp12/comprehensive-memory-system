# COMPREHENSIVE MEMORY SYSTEM CONSTITUTION

## FILE ORGANIZATION PRINCIPLES

### Primary Directive
**Documentation**: All markdown files and AI-generated shell scripts must be written to the `documents/` folder located in this home directory.
**Source Code**: All source code files, project files, and implementation artifacts must be written to the project directory. No exceptions unless explicitly changed via constitutional amendment.

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

#### New Source Code Classification
- Source code files → Project directory (location depends on project type)
- Project files and implementation artifacts → Project directory 
- AI must determine file type and route to appropriate location based on file purpose
- Source code should be organized to maintain project structure and follow established patterns

#### Existing Files
- Current root directory files may be relocated to appropriate `documents/` subfolders
- Relocation should maintain document relationships and accessibility
- Historical context should be preserved during reorganization

#### Shell Scripts
- All AI-generated shell scripts must be placed in `documents/scripts/` or relevant subfolder
- Scripts should be organized by purpose (setup, configuration, utilities, etc.)
- Include descriptive headers in scripts for maintenance purposes

#### Source Code Files
- All source code files (Node.js, Python, Go, etc.) must be placed in the project directory
- Project files must follow established project structure and naming conventions
- Implementation artifacts must be co-located with their corresponding source code

#### Remote System File Management
- **Dual Storage Requirement**: Any file created or updated on SARK or CLU systems must also be stored locally in the project directory
- **Configuration Backup Directory**: All configuration files, scripts, and documentation must be backed up to `documents/cluster-config/` with logical subfolder organization
- **Recreation Documentation**: A comprehensive document must be maintained in the backup directory explaining how to recreate the cluster state from the backed up files
- **File Mapping**: Each file on SARK/CLU must have a corresponding entry in the recreation documentation specifying its proper destination path and purpose
- **Version Control**: Critical configuration files should be tracked in version control when appropriate, with clear separation between development and production configurations

### Governance
- This constitution may be amended only through explicit consensus
- Changes should be documented with revision history
- Maintainers should strive to uphold these organizational principles

### AI Commit Restrictions
- **ABSOLUTE PROHIBITION** against any git commits without explicit user review and authorization
- All changes must be presented to the user for approval before committing to version control
- AI system must maintain a staging area for all changes and seek explicit permission for each commit
- Commit messages must be reviewed and approved by the user before execution
- No automated commits, batch commits, or commit-all operations without user consent

### Purpose
This constitution ensures:
- Consistent file organization across the project lifecycle
- Reduced root directory clutter through systematic categorization
- Enhanced discoverability through logical grouping
- Scalable structure that accommodates project growth
- Clear separation between BMAD project documentation and general documentation
- Clear separation between documentation (documents/) and source code (project directory)
- Proper organization of both documentation and implementation artifacts

## SYSTEM ARCHITECTURE

### Client-Server Architecture
- **FLYNN**: Development client running on Mac laptop
- **SARK** (192.168.68.69) and **CLU** (192.168.68.71): Clustered pair of headless NVidia DGX Spark Systems
- **Server Backend**: All docker containers, LLMs, and agentic server systems run exclusively on SARK and CLU
- **LLM Instance**: This GLM-4.5 Air model operates on the backend server infrastructure
- **Development Workflow**: Code development occurs on FLYNN client
- **Server Management**: All improvements to AI server backend must be performed exclusively on SARK and CLU systems

### System Design Principles
- **Decoupled Architecture**: Client (FLYNN) and backend (SARK/CLU) operate independently
- **Service-Oriented Backend**: Clients connect to complete AI system through services provided on CLU and SARK
- **Development-Focused Clients**: Primary clients are development workstations creating agentic code
- **Backend-Heavy Processing**: All computational resources, LLM execution, and container orchestration handled by SARK/CLU cluster

### Network Access Requirements
- **No DNS Resolution**: Network operates without DNS service
- **IP-Only Access**: SARK (192.168.68.69) and CLU (192.168.68.71) must be accessed exclusively by IP address
- **No Hostname Resolution**: All server connections must use IP addresses, not hostnames
- **Configuration Compliance**: All configuration files, scripts, and documentation must reference IP addresses only

### Container Data Persistence Policy
- **Host-Mounted Data Storage**: All containers deployed on SARK and CLU must write persistent data (files, databases, configurations) to the local file system using Docker volume mounts
- **Container Independence**: Container regeneration must not result in data loss - all stateful data must be preserved across container restarts/regenerations
- **Volume Mount Requirements**: 
  - Database containers: Data directories mounted to `~/data-service-name/` or appropriate `/home/maxvamp/data/` subdirectories
  - Configuration files: Mounted to `~/config-service-name/` or appropriate `/home/maxvamp/config/` subdirectories  
  - Log files: Mounted to `~/logs-service-name/` or appropriate `/home/maxvamp/logs/` subdirectories
  - **System Applications**: Use of `/opt/` directory is acceptable for system applications and services
- **Backup Integration**: All host-mounted data volumes must be integrated with existing Borg backup system
- **No Container-Only Data**: Prohibition against storing critical data exclusively within container layers or ephemeral storage

### Memory Service Replacement Policy
- **Existing Memory Service**: Current Memory Service running on CLU:3000 is considered obsolete and is being replaced
- **Replacement Requirement**: The new enhanced Memory Service must implement structured JSON memory model with evidence anchors, verbatim context window, and multi-domain support (technical code, electronics/maker/robotics, religious topics)
- **Data Migration**: All existing memory data must be migrated from the obsolete service to the new structured format with preservation of semantic relationships and evidence chains
- **Service Transition**: The obsolete Memory Service must be decommissioned only after the new service is fully operational and all data migration is validated
- **API Compatibility**: The new Memory Service must maintain API compatibility for external integrations while implementing enhanced internal architecture

## CONTEXT WINDOW PRESERVATION

### Constitution Read-After-Compaction Rule
After each compaction of the context window, **this constitution must be reread** to eliminate any drift or misalignment between the current system state and the constitutional framework. This ensures that all organizational principles, system architecture specifications, and governance rules remain accurately represented and consistently applied throughout the development lifecycle.

### Implementation Requirements
- **Automatic Verification**: Each context window compaction must trigger a mandatory constitution review
- **Drift Detection**: Compare current system state against constitutional requirements
- **Correction Protocol**: Address any identified drift through explicit constitutional amendments
- **Documentation**: Maintain record of all constitution reviews and resulting amendments

## SYSTEM OPERATIONAL PROTOCOLS

### vLLM Cluster Management Restrictions
**CRITICAL OPERATIONAL CONSTRAINTS**:
1. **vLLM Cluster Operations**: **ABSOLUTE PROHIBITION** against stopping, restarting, or modifying the vLLM cluster or any running vLLM processes/services without explicit written authorization from the user. The vLLM cluster is a critical production system and any disruption will impact the entire RAG functionality.
2. **Service State Protection**: All vLLM-related containers, processes, and services must be maintained in their current operational state. Any changes require explicit user permission and proper backup procedures.

### vLLM Cluster Architecture Specification
**ARCHITECTURAL DEFINITION - MUST BE UNDERSTOOD BY ALL AGENTS**:
1. **Cluster Configuration**: 
   - **SARK (192.168.68.69)**: vLLM head node with HTTP API endpoint (port 8000)
   - **CLU (192.168.68.71)**: vLLM worker node (NO HTTP endpoint)
   - **Communication**: NCCL-based NVIDIA DGX-optimized communication
   - **Architecture**: Ray cluster with tensor parallelism (not HTTP-based cluster)

2. **Model Distribution**:
   - **Model**: GLM-4.5 Air (235B parameter model)
   - **Distribution**: Split across both nodes using tensor parallelism
   - **Processing**: Both nodes actively processing parts of the model
   - **No Failover**: Single model instance, no alternative cluster or fallback nodes

3. **Endpoint Expectations**:
   - **SARK Head**: ✅ EXPECTED to expose HTTP API endpoint on port 8000
   - **CLU Worker**: ✅ EXPECTED to have NO HTTP endpoint on port 8000 (Ray worker only)
   - **"Connection Refused"**: ✅ NORMAL behavior for CLU worker node (not an issue)
   - **GPU Utilization**: ✅ 94% confirms workers are actively processing (expected state)

4. **Monitoring Requirements**:
   - **vLLM Head**: Monitor via HTTP API endpoint (SARK:8000)
   - **vLLM Worker**: Monitor via GPU utilization metrics only (no HTTP endpoint)
   - **Ray Communication**: Internal Ray/NCCL communication (no external monitoring needed)
   - **NCCL Performance**: Monitor via GPU metrics and Ray logs

5. **Service Mesh Integration**:
   - **Head Node**: Include in service mesh with HTTP endpoint monitoring
   - **Worker Nodes**: Exclude from HTTP-based service mesh (Ray internal only)
   - **Load Balancing**: Not applicable (single model, tensor parallel)
   - **Health Checks**: Use GPU utilization and Ray worker status (no HTTP checks)

6. **Critical Misunderstanding Prevention**:
   - **"Connection Refused"**: NEVER identify as an issue for worker nodes
   - **Missing HTTP Endpoints**: NEVER require for worker nodes in Ray architecture
   - **GPU Utilization**: PRIMARY indicator of worker node health (94% = healthy)
   - **Ray Logs**: Secondary indicator of worker node status
   - **NCCL Performance**: Tertiary indicator of cluster communication health

### Client Startup Protocol
**MANDATORY STARTUP SEQUENCE**:
1. **Persona Activation**: On client startup, immediately activate the following BMAD personas:
   - **Winston** (System Architect) - from `_bmad/bmm/agents/architect.md`
   - **Game Developer** (Team Lead) - from `_bmad/bmgd/agents/game-dev.md`
   - **Amelia** (Developer Agent) - from `_bmad/bmm/agents/dev.md`
   All personas must be activated with config.yaml loading and proper initialization.

2. **Context Document Loading**: Immediately load and parse `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/SESSION_RESUME_CONTEXT.md` to preserve historical context and current implementation status.

### Session Context Management
**CONTEXT MAINTENANCE PROTOCOLS**:
1. **Document Synchronization**: After each constitution reading, verify that the task list in implementation documentation is synchronized with actual implementation status. Check for:
   - Completed tasks vs. documented status
   - Current work in progress vs. documented status
   - Any discrepancies between actual implementation and documented progress

2. **Context Updates**: At critical milestones (task completion, phase transitions), update the SESSION_RESUME_CONTEXT.md document to reflect current state, ensuring context window preservation for potential client shutdown/restart scenarios.

### Implementation Documentation Verification
**TASK SYNCHRONIZATION PROTOCOL**:
- **Verification Points**: After constitution reading, verify task list synchronization
- **Documentation Check**: Compare actual implementation status against documented status
- **Progress Tracking**: Ensure all completed tasks are properly marked as completed
- **Future Tasks**: Verify upcoming tasks are accurately documented and aligned with implementation plan

---
*Established: December 22, 2025*
*Amendment Process: Requires explicit consensus for changes*
*Last Amendment: December 25, 2025 - Added Memory Service Replacement Policy and Source Code Classification*
*Vital Amendment: December 25, 2025 - Added System Operational Protocols (vLLM Cluster Restrictions, Startup Protocol, Context Management)*
*Critical Amendment: December 25, 2025 - Added AI Commit Restrictions (No commits without explicit user review)*
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

### Implementation and Documentation Standards
- **Evidence-Based Documentation**: All documents must provide a realistic roadmap for recovery and proper implementation, with strict verification protocols to prevent future documentation mismatches
- **Verification-Driven Development**: All work must be evidence-based and verification-driven, requiring physical proof of completion before any status claims are made
- **Documentation Accuracy**: All documentation must maintain 100% accuracy between documented status and actual implementation state
- **Verification Protocols**: Mandatory verification procedures for all task completions, including service health checks, data integrity validation, and configuration verification
- **Evidence Collection**: All implementations must include evidence collection procedures (screenshots, logs, test results) before documentation of completion
- **Quality Assurance Gates**: Multiple verification checkpoints must be established throughout the implementation lifecycle to ensure documentation accuracy
- **Incremental Verification**: Small, verifiable steps must be taken with evidence collected at each step before proceeding to next steps
- **Test-Driven Implementation**: All features must include verification tests that validate functionality before completion is claimed

### Purpose
This constitution ensures:
- Consistent file organization across the project lifecycle
- Reduced root directory clutter through systematic categorization
- Enhanced discoverability through logical grouping
- Scalable structure that accommodates project growth
- Clear separation between BMAD project documentation and general documentation
- Clear separation between documentation (documents/) and source code (project directory)
- Proper organization of both documentation and implementation artifacts
- Evidence-based documentation with realistic implementation roadmaps
- Verification-driven development with strict documentation accuracy protocols
- Quality assurance through mandatory verification procedures and checkpoints
- Prevention of documentation mismatches through evidence-based progress tracking
- Test-driven implementation with comprehensive validation procedures

## BACKUP SYSTEM PROTOCOL

### Backup System Structure and Requirements

#### 11.1 Backup System Folder Structure
- **MANDATORY LOCATION**: All backup-related files and documentation **MUST** be stored in `Backup-system/` folder at the project root directory
- **Folder Naming**: `Backup-system/` (exact name as specified)
- **Purpose**: Centralized location for all backup-related files, scripts, and documentation
- **Accessibility**: Must be easily accessible for backup operations and disaster recovery

#### 11.2 Master Backup Script Requirements
- **MASTER SCRIPT LOCATION**: The master `backup-clu.sh` script **MUST** be preserved in `/home/maxvamp/borg-docker/` on SARK (192.168.68.69)
- **SCRIPT INTEGRITY**: The master script must **NEVER** be renamed, deleted, or modified directly
- **COPY PROTOCOL**: All modifications must be made to a local copy in the `Backup-system/` folder first
- **VALIDATION**: Before deployment, local copies must be tested and validated

#### 11.3 Local Backup System Folder Structure
```
Backup-system/
├── scripts/
│   ├── backup-clu.sh           # Master copy for local testing and validation
│   ├── backup-config.conf      # Backup configuration files
│   └── backup-restore.sh       # Restore operations
├── documentation/
│   ├── BACKUP_NOTES.md        # Backup operation notes
│   ├── DISASTER_RECOVERY.md   # Disaster recovery procedures
│   ├── VORTA_CONFIGURATION.md # Vorta backup interface config
│   └── BACKUP_USAGE.md       # Usage instructions and examples
├── configurations/
│   ├── backup-config.conf     # Main backup configuration
│   ├── vorta-config.json      # Vorta GUI configuration
│   └── backup-cron.conf       # Cron job configurations
├── logs/
│   ├── backup.log            # Backup operation logs
│   └── backup-clu.log       # CLU backup extension logs
└───── archives/
     └───── historical/       # Historical backup scripts and configs
```

#### 11.4 Backup Script Modifications Protocol
- **Step 1**: Create/modify local copy in `Backup-system/scripts/`
- **Step 2**: Test local copy for syntax and logic validation
- **Step 3**: Validate against existing backup infrastructure
- **Step 4**: User authorization required for deployment to SARK
- **Step 5**: Deploy only after successful local testing and user approval
- **Step 6**: Update documentation in `Backup-system/documentation/`

#### 11.5 Documentation Requirements
- **MANDATORY**: All backup operations must have corresponding documentation
- **LOCATION**: All backup documentation **MUST** be in `Backup-system/documentation/`
- **CONTENT**: Include setup instructions, usage examples, troubleshooting guides
- **VERSIONING**: Maintain version history for all backup scripts and configurations

#### 11.6 Emergency Backup Procedures
- **CRITICAL**: In case of master script corruption, restore from local copy
- **PROCEDURE**: Use the local copy in `Backup-system/scripts/` as recovery source
- **VALIDATION**: Validate restored script functionality before deployment
- **DOCUMENTATION**: Document restoration process for future reference

#### 11.7 Backup System Integration
- **BORG INTEGRATION**: All backup scripts must integrate with existing Borg backup system
- **BACKUP SERVER**: Must work with borg-backup-server on SARK (port 2222)
- **DATA PERSISTENCE**: Ensure all backed up data follows constitution container data persistence policy
- **COMPLIANCE**: Must comply with all constitution requirements for data storage

#### 11.8 Backup System Governance
- **AMENDMENT PROCESS**: Changes to backup system require explicit consensus
- **AUDIT TRAIL**: All modifications must be documented with timestamps
- **VALIDATION**: Regular testing of backup and restore procedures required
- **RECOVERY**: Documented recovery procedures for all backup scenarios

---

## SYSTEM ARCHITECTURE

### Client-Server Architecture
- **FLYNN**: Development client running on Mac laptop
- **SARK** (192.168.68.69) and **CLU** (192.168.68.71): Clustered pair of headless NVidia DGX Spark Systems
- **Server Backend**: All docker containers, LLMs, and agentic server systems run exclusively on SARK and CLU
- **LLM Instance**: This GLM-4.5 Air model operates on the backend server infrastructure
- **Development Workflow**: Code development occurs on FLYNN client
- **Server Management**: All improvements to AI server backend must be performed exclusively on SARK and CLU systems
- **User**: Max (primary user and system administrator)

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
3. **MANDATORY PROTECTION**: **NEVER SHUT DOWN vLLM or its containers under any circumstances** - This is a non-negotiable mandate. vLLM cluster protection takes precedence over all other operational procedures.

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

## VERIFICATION PROTOCOLS AND DOCUMENTATION

### Implementation Audit Documentation Framework

#### 10.1 Audit Documentation Requirements

##### 10.1.1 Purpose and Scope
- **Purpose**: Ensure evidence-based implementation with comprehensive audit trails
- **Scope**: All system implementations, deployments, and modifications
- **Goal**: Eliminate documentation drift and provide verifiable progress tracking

##### 10.1.2 Audit Document Location
- **Primary Location**: `documents/implementation-audit/`
- **Document Naming**: `phase-[phase-number]-[section-name]-audit.md`
- **Version Control**: Each audit document is unique and saved upon completion
- **Retention**: All audit documents must be retained for project lifetime

##### 10.1.3 Audit Trigger Requirements
- **Phase Completion**: Audit required after all sub-items of a phase are completed
- **Section Completion**: Audit required after all sub-items of a section are completed
- **Before Progress**: Must be completed before moving to next phase/section
- **Evidence Verification**: All audit claims must have physical evidence

#### 10.2 Comprehensive Audit Report Template

##### 10.2.1 Required Report Sections (ALL 9 ITEMS MUST BE INCLUDED)
**CRITICAL: DOCUMENTATION CREATION MANDATORY**
- **MANDATORY ACTION**: Each audit document MUST BE PHYSICALLY CREATED and saved to disk
- **ZERO TOLERANCE**: No audit reporting is complete without the actual file being created
- **DATA PROTECTION**: Failure to create audit documents constitutes data loss and system integrity violation
- **ENFORCEMENT**: Audit reports are NOT COMPLETE until the file exists on the filesystem

**Section 1: Executive Summary**
- Audit overview and key findings
- Phase/section identification
- Overall status assessment
- Time elapsed metrics

**Section 2: Key Findings**
- Critical issues identified
- Success metrics achieved
- Risk assessment results
- Compliance verification status

**Section 3: Implementation Audit Details**
- Detailed task-by-task execution records
- Evidence for each completed task
- Verification results for each task
- Implementation methodology used

**Section 4: Performance Metrics**
- Time efficiency measurements
- Resource utilization metrics
- Quality assurance indicators
- System performance baselines

**Section 5: Compliance Verification**
- Constitution compliance results
- System architecture compliance
- Operational protocol compliance
- Governance requirements verification

**Section 6: Files and Configurations**
- Created files and locations
- Modified files and changes
- Directories created
- Containers deployed

**Section 7: Audit Verification**
- Evidence collection quality assessment
- Risk evaluation results
- Success criteria verification
- System impact analysis

**Section 8: Next Steps**
- Recommended immediate actions
- Phase progression readiness
- Outstanding issues to address
- Integration requirements

**Section 9: Conclusion**
- Phase/section certification
- Overall impact assessment
- Audit completion certification
- Readiness for next phase

#### 10.3 Evidence Collection Standards

##### 10.3.1 Evidence Requirements
- **Physical Evidence**: 100% of audit claims must have verifiable proof
- **DOCUMENTATION CREATION EVIDENCE**: Physical file creation is mandatory audit evidence
- **FILE VERIFICATION**: Audit completion requires file system verification of created documents
- **DATA INTEGRITY**: All audit documents must be immediately verifiable on filesystem
- **Documentation Trail**: All changes must be documented with timestamps
- **Configuration Accuracy**: All modifications must be verified against requirements
- **System Impact**: No unintended side effects documented

##### 10.3.2 Evidence Types
- **Command Outputs**: SSH command results and responses
- **File Contents**: Actual file contents and modifications
- **Container Status**: Docker container states and logs
- **Network Connectivity**: Ping tests, HTTP responses, port checks
- **System Metrics**: Resource utilization, performance measurements
- **Configuration Files**: Actual deployed configurations
- **Service Health**: Health check results and status codes

##### 10.3.3 Evidence Storage
- **Location**: Evidence embedded within audit documents
- **Format**: JSON-formatted evidence with timestamps
- **Retention**: Permanent retention for audit trail
- **Accessibility**: Evidence must be easily verifiable

#### 10.3.4 DOCUMENTATION CREATION PROTOCOLS
- **ZERO TOLERANCE POLICY**: No audit is complete without physical file creation
- **MANDATORY VERIFICATION**: File existence must be verified before audit completion
- **DATA LOSS PREVENTION**: All audit documents must be immediately created and saved
- **SYSTEM INTEGRITY**: Audit documentation failure constitutes system integrity violation
- **ENFORCEMENT MECHANISMS**: 
  - File system verification required for all audit completions
  - Physical file creation is mandatory evidence
  - No audit reporting is complete without file verification
  - Data loss prevention protocols enforced at all times

#### 10.4 Context Drift Prevention Methods

##### 10.4.1 Context Preservation
- **Audit Trail**: Complete documentation of all changes
- **Evidence Collection**: Physical proof for all claims
- **Status Verification**: Verification of actual vs. documented state
- **Progress Tracking**: Incremental verification at each step

##### 10.4.2 Drift Detection
- **Comparison Protocol**: Regular comparison of actual vs. documented state
- **Verification Points**: Mandatory verification at major milestones
- **Alert System**: Automatic alerts for documentation mismatches
- **Correction Protocol**: Defined process for addressing drift

##### 10.4.3 Context Window Preservation
- **Audit Reading**: Constitution must be read after each audit completion
- **Context Updates**: SESSION_RESUME_CONTEXT.md must be updated after each audit
- **Documentation Synchronization**: Task lists must match actual implementation
- **Progress Tracking**: All progress must be evidence-based

#### 10.5 Evidence Retention Policies

##### 10.5.1 Retention Requirements
- **Permanent Retention**: All audit documents must be retained permanently
- **Evidence Preservation**: All evidence must be preserved with audit documents
- **Backup Integration**: Audit documents must be backed up with Borg system
- **Version Control**: No deletion or modification of completed audit documents

##### 10.5.2 Audit Document Structure
```
documents/
├── implementation-audit/
│   ├── phase-1-integration-foundation-audit.md
│   ├── phase-2-service-mesh-audit.md
│   ├── phase-3-optimization-audit.md
│   └── [future phase audits...]
└── [other documentation...]
```

#### 10.6 Verification Checkpoint Requirements

##### 10.6.1 Checkpoint Triggers
- **After Phase Completion**: Mandatory checkpoint after each phase completion
- **Before Phase Progress**: Cannot progress to next phase without checkpoint
- **Evidence Collection**: All evidence must be collected before checkpoint
- **Documentation Update**: SESSION_RESUME_CONTEXT.md must be updated at checkpoint

##### 10.6.2 Checkpoint Verification Process
1. **Evidence Collection**: Gather all physical evidence for completed tasks
2. **Documentation Verification**: Compare actual vs. documented state
3. **DOCUMENTATION CREATION VERIFICATION**: PHYSICALLY CREATE all required audit documents
4. **File System Verification**: Verify ALL audit documents exist on filesystem
5. **Compliance Check**: Verify constitution and protocol compliance
6. **Risk Assessment**: Evaluate current state risks and issues
7. **Certification**: Issue phase completion certification
8. **Context Update**: Update SESSION_RESUME_CONTEXT.md with findings

#### 10.6.3 DOCUMENTATION CREATION PROTOCOLS
- **PHYSICAL CREATION MANDATORY**: All audit documents MUST BE PHYSICALLY CREATED and saved
- **ZERO TOLERANCE**: No checkpoint passes without physical file creation
- **DATA LOSS PREVENTION**: File creation is mandatory checkpoint requirement
- **SYSTEM INTEGRITY**: Documentation creation failure = system integrity violation
- **VERIFICATION PROTOCOL**:
  - File existence verification required for all audit completions
  - Physical file path verification mandatory
  - Document accessibility confirmation required
  - No checkpoint completion without file verification

##### 10.6.3 Checkpoint Success Criteria
- **Evidence Coverage**: 100% of audit claims have physical evidence
- **Documentation Accuracy**: 100% match between documentation and reality
- **DOCUMENTATION CREATION**: 100% of required audit documents PHYSICALLY CREATED and verified
- **File System Verification**: 100% of audit documents exist and are accessible
- **Compliance Verification**: 100% compliance with all protocols
- **Risk Mitigation**: All critical risks addressed or documented
- **System Stability**: System remains stable and operational
- **Readiness Certification**: Phase ready for progression

#### 10.6.4 DOCUMENTATION CREATION ENFORCEMENT
- **PHYSICAL CREATION MANDATORY**: All audit documents MUST BE PHYSICALLY CREATED
- **ZERO TOLERANCE**: No checkpoint completion without physical file creation
- **DATA LOSS PROTECTION**: File creation is non-negotiable audit requirement
- **SYSTEM INTEGRITY**: Documentation creation failure = system failure
- **ENFORCEMENT MEASURES**:
  - File system verification required for all checkpoint completions
  - Physical document creation is mandatory evidence
  - No phase progression without documentation creation verification
  - Data loss prevention enforced at all checkpoints

#### 10.7 Audit Display Requirements

##### 10.7.1 User Display Requirements
- **Summary Display**: After each audit completion, display summary to user
- **File Location**: Display comprehensive document location to user
- **Phase Status**: Display current phase status and readiness
- **Next Steps**: Display recommended next actions

##### 10.7.2 Display Content
- **Audit Summary**: Brief overview of audit results
- **Key Findings**: Critical issues and success metrics
- **Document Location**: Full path to comprehensive audit document
- **Phase Status**: Current phase completion status
- **Next Steps**: Immediate action recommendations
- **Evidence Summary**: Summary of collected evidence

##### 10.7.3 Display Format
```
=== PHASE [X] COMPLETION AUDIT ===

Status: ✅ COMPLETED
Time Elapsed: [X] minutes
Key Findings: [Summary]
Issues Identified: [List]

Comprehensive Document: documents/implementation-audit/phase-X-section-name-audit.md

Next Steps: [Action items]
Evidence Collected: [Count] items

Ready for Phase [X+1]: ✅ YES/NO
```

#### 10.8 Audit Workflow Integration

##### 10.8.1 Workflow Steps
1. **Phase Completion**: All sub-items of phase completed
2. **Evidence Collection**: Gather all physical evidence
3. **DOCUMENTATION CREATION**: PHYSICALLY CREATE all required audit documents
4. **File System Verification**: VERIFY all audit documents exist on filesystem
5. **Audit Report Generation**: Create comprehensive audit document
6. **Summary Display**: Show summary to user with document location
7. **Context Update**: Update SESSION_RESUME_CONTEXT.md
8. **Constitution Reading**: Read constitution to preserve context
9. **Phase Certification**: Certify phase completion
10. **Progression**: Allow progression to next phase

#### 10.8.2 DOCUMENTATION CREATION PROTOCOLS
- **PHYSICAL CREATION MANDATORY**: All audit documents MUST BE PHYSICALLY CREATED
- **VERIFY BEFORE PROCEED**: File verification required before any progression
- **ZERO TOLERANCE**: No workflow step advancement without physical file creation
- **DATA LOSS PREVENTION**: Documentation creation is mandatory workflow step
- **ENFORCEMENT MECHANISMS**:
  - File system verification required before progression
  - Physical document creation is mandatory workflow step
  - No phase advancement without documentation verification
  - Data loss prevention enforced in all workflow steps

##### 10.8.2 Mandatory Audits
- **Phase 1 Audit**: Integration Foundation audit
- **Phase 2 Audit**: Service Mesh Implementation audit
- **Phase 3 Audit**: Optimization and Enhancement audit
- **Milestone Audits**: Any major system milestone completion

#### 10.8.3 DOCUMENTATION CREATION ENFORCEMENT
- **PHYSICAL CREATION MANDATORY**: All audit documents MUST BE PHYSICALLY CREATED
- **VERIFY BEFORE PROCEED**: File verification required before proceeding
- **ZERO TOLERANCE**: No audit completion without physical file creation
- **DATA LOSS PREVENTION**: Documentation creation is mandatory audit requirement
- **ENFORCEMENT PROTOCOLS**:
  - File system verification required for all audit completions
  - Physical document creation is mandatory evidence
  - No phase advancement without documentation verification
  - Data loss prevention enforced at all audit points

##### 10.8.3 Audit Quality Assurance
- **Template Compliance**: All 9 sections must be included
- **Evidence Verification**: All claims must have verifiable proof
- **Documentation Accuracy**: No documentation drift allowed
- **Compliance Verification**: Full compliance with all protocols

#### 10.9 Special Audit Requirements

##### 10.9.1 Emergency Audits
- **Trigger**: System changes, failures, or critical incidents
- **Scope**: Immediate assessment of system state
- **Purpose**: Rapid context preservation and issue resolution
- **Format**: Simplified emergency audit template

##### 10.9.2 Pre-Deployment Audits
- **Trigger**: Before any production deployment
- **Scope**: System readiness and stability verification
- **Purpose**: Ensure deployment safety and success
- **Format**: Deployment-specific audit template

##### 10.9.3 Post-Implementation Audits
- **Trigger**: After major system implementation
- **Scope**: Implementation success and impact assessment
- **Purpose**: Verify implementation meets requirements
- **Format**: Implementation-specific audit template

---

#### 10.10 DOCUMENTATION CREATION CRITICAL REQUIREMENTS

##### 10.10.1 Zero Tolerance Policy
- **CRITICAL**: DOCUMENTATION CREATION FAILURE = SYSTEM INTEGRITY VIOLATION
- **MANDATORY**: All audit documents MUST BE PHYSICALLY CREATED and saved to filesystem
- **ENFORCED**: No audit completion without physical file verification
- **PROTECTED**: Data loss prevention is non-negotiable requirement

##### 10.10.2 File Creation Verification Protocol
- **STEP 1**: Create all required audit documents
- **STEP 2**: Verify file existence on filesystem
- **STEP 3**: Confirm document accessibility and readability
- **STEP 4**: Document file path and location for audit trail
- **STEP 5**: Include file verification evidence in audit report
- **STEP 6**: Only proceed to next phase after file verification

##### 10.10.3 Data Loss Prevention Enforcement
- **ENFORCEMENT MECHANISM**: File system verification required for all audit completions
- **PROTOCOL**: Physical document creation is mandatory evidence
- **ZERO TOLERANCE**: No phase advancement without documentation verification
- **SYSTEM INTEGRITY**: Documentation creation failure = system failure

##### 10.10.4 Critical Failure Protocol
- **TRIGGER**: Any missing or inaccessible audit documents
- **RESPONSE**: Immediate halt to all system progression
- **CORRECTION**: Mandatory document recreation and verification
- **RESOLUTION**: Only proceed after successful file verification

*Established: December 26, 2025*
*Section: Verification Protocols and Documentation*
*Integration: Complete system audit framework*
*CRITICAL UPDATE: Documentation Creation Zero Tolerance Policy - December 26, 2025*
*Established: December 22, 2025*
*Amendment Process: Requires explicit consensus for changes*
*Last Amendment: December 26, 2025 - Added Implementation and Documentation Standards (Evidence-based and verification-driven principles)*
*Previous Amendment: December 25, 2025 - Added Memory Service Replacement Policy and Source Code Classification*
*Vital Amendment: December 25, 2025 - Added System Operational Protocols (vLLM Cluster Restrictions, Startup Protocol, Context Management)*
*Critical Amendment: December 25, 2025 - Added AI Commit Restrictions (No commits without explicit user review)*

*Backup System Amendment: December 27, 2025 - Added Backup System Protocol (Backup-system folder structure, master backup-CLU.sh preservation, local copy requirements)*

#### 10.11 Phase 3 Audit Format Requirements
#### 10.8.3 Phase 3 Audit Document Structure Requirements
- **SINGLE AUDIT DOCUMENT PER PHASE**: One comprehensive audit document per phase covering all work completed in that phase
- **TASK-BASED UPDATES**: Document is updated as tasks are completed within the phase
- **COMPREHENSIVE COVERAGE**: Document serves as the single authoritative audit record for the entire phase
- **ACCURATE STATUS**: Document accurately reflects the status of the last completed task (whether phase is complete or ongoing)
- **NO PER-TASK DOCUMENTS**: No separate audit documents per individual task within a phase
- **PHASE COMPLETION AUDIT**: Final audit document created when phase is fully completed

#### 10.8.4 Phase 3 Audit Format Requirements
- **MANDATORY FORMAT COMPLIANCE**: Phase 3 audit documents MUST follow the EXACT same format and structure as Phase 1 and Phase 2 audit documents
- **DOCUMENT TITLE**: "Implementation Audit Report - Phase 3: Enhancement and Optimization"
- **SECTION STRUCTURE**: All 9 sections must be included and formatted identically to Phase 1/Phase 2 documents
- **STATUS ACCURACY**: Status header must accurately reflect actual phase completion percentage
- **TIMESTAMP AUDIT**: Document must be updated with timestamps as tasks are completed
- **ZERO TOLERANCE**: NO deviations from the Phase 1/Phase 2 format will be permitted for Phase 3 documents
- **AUDIT TEMPLATE**: Phase 3 audit documents MUST use the exact template structure from Phase 1 and Phase 2 with only content differences
- **SECTION HEADERS**: ALL section headers MUST match Phase 1 and Phase 2 headers exactly, including emoji patterns and numbering
- **DOCUMENTATION STRUCTURE**: The complete 9-section structure MUST be maintained exactly as established in Phase 1 and Phase 2

---

## FILE LOCATION AND REPOSITORY REQUIREMENTS

### 12.1 Primary File Location Directive
**MANDATORY REQUIREMENT**: ALL code, documentation, configuration files, and implementation artifacts MUST be stored in the project directory at `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/` with the following exceptions:

#### 12.1.1 Absolute Requirements
- **Project Root Directory**: `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/` is the ONLY authorized location for:
  - All source code files
  - All documentation files
  - All configuration files
  - All scripts and automation files
  - All audit and compliance documentation
  - All container and deployment artifacts
  - All test files and testing frameworks
  - All backup and recovery documentation

#### 12.1.2 Server-Side File Management
- **SARK/CLU Server Files**: Files on SARK (192.168.68.69) and CLU (192.168.68.71) must be backed up to the project directory
- **Configuration Backups**: All server configurations must have corresponding files in the project directory
- **Documentation Sync**: All server-side documentation must be replicated in the project directory
- **Script Management**: All scripts must exist in the project directory first, then deployed to servers

#### 12.1.3 No Exceptions Policy
- **ZERO TOLERANCE**: No exceptions to the file location requirement
- **MANDATORY DUPLICATION**: All server-side files must have project directory copies
- **VERSION CONTROL COMPLIANCE**: All project files must be tracked in git
- **BACKUP INTEGRATION**: Project directory files must integrate with existing backup systems

### 12.2 Directory Structure Requirements

#### 12.2.1 Required Directory Structure
```
/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/
├── documents/                    # General documentation and session context
├── docs/                         # BMAD project documentation
├── src/                          # All source code
├── config/                      # All configuration files
├── scripts/                     # All automation scripts
├── tests/                       # All test files
├── Backup-system/              # Backup system files and documentation
├── memory-service/             # Memory service implementation
├── src/caching/                # Caching implementation
├── src/load-balancer/          # Load balancer implementation
├── src/memory/                 # Memory system implementation
├── src/config/                # Configuration management
└── docs/implementation-audit/  # Audit documentation
```

#### 12.2.2 File Organization Rules
- **Documentation Separation**: 
  - `documents/` for session context and general documentation
  - `docs/` for BMAD project documentation
  - `docs/implementation-audit/` for audit documentation
- **Code Organization**: All source code in `src/` with logical subdirectories
- **Configuration Management**: All configs in `config/` and `src/config/`
- **Script Management**: All scripts in `scripts/` with logical subdirectories

#### 12.2.3 AI Testing and Temporary Files Requirements
- **AI_TMP Directory**: Create `AI_tmp/` folder at project root for files/scripts exclusively used by AI for testing and validation purposes
- **Root Directory Purity**: Only essential files that absolutely must be in project root (e.g., SESSION_RESUME_CONTEXT.md, constitution files, gitignore) may remain in root directory
- **Source Code Enforcement**: Explicit prohibition of .js, .py, .go, and other source code files in project root directory - all must be in appropriate subdirectories
- **Testing Files**: All AI testing scripts, temporary validation files, and development artifacts must be stored in `AI_tmp/` with appropriate subfolder organization
- **Cleanup Protocol**: AI_tmp files should be automatically cleaned up after successful testing/validation to prevent root directory accumulation

#### 12.2.4 Enhanced File Organization Rules
- **Root Directory Allowlist**: Only files explicitly required for project operation (SESSION_RESUME_CONTEXT.md, CONSTITUTION.md, README.md, .gitignore, .mcp.json) may exist in project root
- **Source Code Enforcement**: Zero tolerance for source code files (.js, .py, .go, .java, etc.) in project root directory
- **Script Migration**: All existing root-level scripts must be moved to appropriate subdirectories (scripts/, AI_tmp/)
- **Documentation Migration**: All root-level documentation must be moved to appropriate subdirectories (documents/, docs/)

### 12.3 Server File Management Protocol

#### 12.3.1 Server File Requirements
- **MANDATORY BACKUP**: All server files must have corresponding project directory files
- **SCRIPT DEPLOYMENT**: Scripts must be developed in project directory, then deployed
- **CONFIGURATION SYNC**: Server configs must be backed up to project directory
- **DOCUMENTATION REPLICATION**: All server documentation must be replicated in project directory

#### 12.3.2 Server File Locations
- **SARK Files**: `/home/maxvamp/` directories on SARK must have project directory backups
- **CLU Files**: `/home/maxvamp/` directories on CLU must have project directory backups
- **Backup System**: `Backup-system/` folder in project directory for all backup-related files

### 12.4 Conflict Identification and Resolution

#### 12.4.1 Identified Conflicts
1. **Backup Script Location Conflict**:
   - **Current**: Section 11.2 requires master backup script at `/home/maxvamp/borg-docker/` on SARK
   - **Required**: All scripts must be in project directory `scripts/` folder
   - **Resolution**: Master backup script must be copied to project directory first, then deployed to SARK

2. **Configuration File Location Conflict**:
   - **Current**: Various sections reference files in `/home/maxvamp/` directories on servers
   - **Required**: All configurations must have project directory copies
   - **Resolution**: Create project directory copies of all server configurations

3. **Documentation Location Conflict**:
   - **Current**: Session context mentions files in various server locations
   - **Required**: All documentation must be in project directory
   - **Resolution**: Move all documentation to project directory structure

#### 12.4.2 Conflict Resolution Protocol
- **PRIORITY**: File location requirements (Section 12) override all other sections
- **BACKUP REQUIREMENT**: All server-side files must have project directory copies
- **DUPLICATION PROTOCOL**: Create project directory copies before modifying server files
- **VERSION CONTROL**: Project directory files must be tracked in git
- **BACKUP INTEGRATION**: Project directory files must work with existing backup systems

### 12.5 Enforcement and Compliance

#### 12.5.1 Zero Tolerance Policy
- **MANDATORY COMPLIANCE**: All files must be in project directory
- **NO EXCEPTIONS**: No server-only files allowed
- **DUPLICATION REQUIRED**: All server files must have project directory copies
- **VERSION CONTROL**: All project files must be git-tracked

#### 12.5.2 vLLM Protection Mandate
- **ABSOLUTE PROTECTION**: vLLM cluster protection takes precedence over ALL other operations
- **NEVER SHUTDOWN**: Absolute prohibition against stopping, restarting, or modifying vLLM containers
- **OPERATIONAL CONSTRAINT**: vLLM containers are critical production systems - any disruption impacts entire RAG functionality
- **PERMISSION REQUIRED**: Any vLLM-related changes require explicit user authorization

#### 12.5.2 Compliance Verification
- **File Verification**: Regular checks that all server files have project directory copies
- **Backup Integration**: Verification that project directory files work with backup systems
- **Version Control**: Ensure all project files are tracked in git
- **Documentation Sync**: Ensure all server documentation is replicated in project directory

### 12.6 Migration Protocol

#### 12.6.1 File Migration Requirements
- **PRIORITY**: Project directory files take precedence
- **SERVER DEPLOYMENT**: Files deployed to servers only after project directory verification
- **BACKUP BEFORE MODIFY**: Always backup project directory files before server deployment
- **TESTING PROTOCOL**: Test all project directory files before server deployment

#### 12.6.2 Migration Process
1. **Create Project Directory Files**: All files must exist in project directory first
2. **Test Project Files**: Verify all project directory files work correctly
3. **Deploy to Servers**: Deploy to SARK/CLU only after project directory verification
4. **Document Migration**: Record all file movements and changes
5. **Verify Deployment**: Confirm server deployment matches project directory files

### 12.7 Exception Handling

#### 12.7.1 Zero Exceptions Policy
- **NO EXCEPTIONS**: No exceptions to file location requirements
- **MANDATORY DUPLICATION**: All server files must have project directory copies
- **VERSION CONTROL COMPLIANCE**: All project files must be git-tracked
- **BACKUP INTEGRATION**: All project files must work with backup systems

#### 12.7.2 Emergency Procedures
- **CRITICAL FAILURE**: Any deviation from file location requirements is critical
- **IMMEDIATE CORRECTION**: Must be corrected immediately
- **BACKUP RESTORATION**: Use project directory files to restore server files
- **DOCUMENTATION UPDATE**: Record all deviations and corrections

### 12.8 Integration with Existing Systems

#### 12.8.1 Backup System Integration
- **BACKUP SYSTEM PROTOCOL**: All project directory files must integrate with existing backup systems
- **SERVER BACKUP REQUIREMENT**: Server files must be backed up using existing Borg backup system
- **PROJECT DIRECTORY BACKUP**: Project directory files must be backed up with existing systems
- **CONSISTENCY MAINTENANCE**: Ensure backup consistency across all systems

#### 12.8.2 Version Control Integration
- **GIT COMPLIANCE**: All project directory files must be tracked in git
- **SERVER DEPLOYMENT**: Server files deployed only after git commit
- **VERSION MAINTENANCE**: Maintain version consistency between project and server files
- **ROLLBACK CAPABILITY**: Ensure ability to rollback to previous versions

### 12.9 Quality Assurance and Verification

#### 12.9.1 Regular Verification
- **FILE VERIFICATION**: Regular checks that all server files have project directory copies
- **BACKUP VERIFICATION**: Verification that backup systems include all project files
- **VERSION CONTROL VERIFICATION**: Ensure all project files are git-tracked
- **FUNCTIONALITY VERIFICATION**: Test that all project files work correctly

#### 12.9.2 Audit Requirements
- **DOCUMENTATION AUDIT**: Regular audits of file location compliance
- **BACKUP AUDIT**: Verification that backup systems include all required files
- **VERSION CONTROL AUDIT**: Ensure all files are properly tracked in git
- **FUNCTIONALITY AUDIT**: Test that all deployed functionality works correctly

### 12.10 Governance and Maintenance

#### 12.10.1 Amendment Process
- **EXPLICIT CONSENSUS**: Only through explicit consensus
- **DOCUMENTATION UPDATE**: All amendments must be documented with revision history
- **COMPLIANCE VERIFICATION**: Ensure all amendments comply with file location requirements
- **BACKUP INTEGRATION**: Ensure amendments integrate with existing backup systems

#### 12.10.2 Maintenance Requirements
- **REGULAR AUDITS**: Regular verification of file location compliance
- **BACKUP MAINTENANCE**: Regular maintenance of backup systems
- **VERSION CONTROL MAINTENANCE**: Regular maintenance of version control systems
- **DOCUMENTATION MAINTENANCE**: Regular updates to documentation and procedures

---
*Established: December 27, 2025*
*Section: File Location and Repository Requirements*
*Integration: Complete file management framework with zero tolerance for location deviations*
*Conflict Resolution: Identified and resolved conflicts with existing backup system protocols*
## OPCODE CONFIGURATION LOCATION REQUIREMENTS

### 13.1 Opencode Configuration Directive
**MANDATORY REQUIREMENT**: ALL Opencode configuration files and MCP server configurations MUST be stored in the local project folder root directory, NOT in the user's home directory.

#### 13.1.1 Absolute Requirements
- **Project Root Directory**: `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/` is the ONLY authorized location for:
  - `.opencode/` directory and all its contents
  - `.mcp.json` configuration file
  - All MCP server implementations and client files
  - All Opencode-related configuration and metadata files

#### 13.1.2 Home Directory Prohibition
- **ZERO TOLERANCE**: `.opencode/` directories and configuration files are PROHIBITED from user's home directory (`~/.opencode/`)
- **MANDATORY LOCAL STORAGE**: All Opencode configurations must exist exclusively in the project directory
- **NO HOME DIRECTORY CONFIGURATION**: Opencode must be configured to use local project directory, not home directory

#### 13.1.3 Configuration File Requirements
- **.mcp.json Location**: MUST be at project root: `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/.mcp.json`
- **MCP Server Location**: MUST be in project directory: `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/.opencode/mcp/`
- **Opencode Configuration**: MUST be in project directory: `/Volumes/Dev/git/CLU_CODE/comprehensive-memory-system/.opencode/`

#### 13.1.4 MCP Server Implementation Requirements
- **Server Scripts**: All MCP server implementations MUST be stored in `.opencode/mcp/` directory
- **Configuration**: MCP server configurations MUST reference absolute paths to project directory files
- **Client Files**: MCP client implementations MUST be stored in `.opencode/mcp/clients/` directory
- **Package Management**: MCP server dependencies MUST be managed within the `.opencode/mcp/` directory

### 13.2 Configuration Management Protocol

#### 13.2.1 Configuration File Creation
- **PROJECT DIRECTORY FIRST**: All configuration files MUST be created in project directory first
- **VALIDATION BEFORE USE**: Configuration MUST be validated before deployment or use
- **BACKUP REQUIREMENT**: Configuration files MUST be backed up with existing backup systems
- **VERSION CONTROL**: Configuration files MUST be tracked in git

#### 13.2.2 Configuration Verification
- **FILE EXISTENCE**: All configuration files MUST exist in project directory
- **PATH VALIDATION**: All file paths in configurations MUST use absolute paths to project directory
- **FUNCTIONALITY TESTING**: Configuration MUST be tested for functionality before deployment
- **INTEGRATION VERIFICATION**: Configuration MUST be verified to work with existing systems

#### 13.2.3 MCP Server Integration
- **SERVER PATHS**: MCP server configurations MUST use absolute paths to project directory files
- **RELATIVE PATHS PROHIBITED**: No relative paths allowed in MCP server configurations
- **ABSOLUTE PATHS REQUIRED**: All file references MUST use absolute paths from project root
- **TESTING PROTOCOL**: MCP servers MUST be tested for functionality before integration

### 13.3 Enforcement and Compliance

#### 13.3.1 Zero Tolerance Policy
- **MANDATORY COMPLIANCE**: All Opencode configurations MUST be in project directory
- **NO EXCEPTIONS**: No home directory configurations allowed
- **DUPLICATION PROHIBITED**: No duplication between home and project directories
- **VERSION CONTROL REQUIRED**: All configurations MUST be git-tracked

#### 13.3.2 Verification Protocol
- **REGULAR AUDITS**: Regular verification that all Opencode configurations are in project directory
- **PATH VALIDATION**: Regular validation that all file paths are absolute and correct
- **FUNCTIONALITY TESTING**: Regular testing that all configurations work correctly
- **INTEGRATION VERIFICATION**: Regular verification that configurations integrate with existing systems

#### 13.3.3 Emergency Procedures
- **CRITICAL FAILURE**: Any home directory configuration is critical failure
- **IMMEDIATE CORRECTION**: Must be corrected immediately by moving to project directory
- **BACKUP RESTORATION**: Use project directory configurations to restore correct state
- **DOCUMENTATION UPDATE**: Record all corrections and deviations

### 13.4 Integration with Existing Systems

#### 13.4.1 Backup System Integration
- **BACKUP SYSTEM PROTOCOL**: All Opencode configurations MUST integrate with existing backup systems
- **PROJECT DIRECTORY BACKUP**: Project directory configurations MUST be backed up with existing systems
- **CONSISTENCY MAINTENANCE**: Ensure backup consistency across all configurations
- **RECOVERY CAPABILITY**: Ensure ability to restore configurations from backups

#### 13.4.2 Version Control Integration
- **GIT COMPLIANCE**: All Opencode configurations MUST be tracked in git
- **CONFIGURATION DEPLOYMENT**: Configurations deployed only after git commit
- **VERSION MAINTENANCE**: Maintain version consistency between configurations
- **ROLLBACK CAPABILITY**: Ensure ability to rollback to previous configurations

### 13.5 Governance and Maintenance

#### 13.5.1 Amendment Process
- **EXPLICIT CONSENSUS**: Only through explicit consensus
- **DOCUMENTATION UPDATE**: All amendments must be documented with revision history
- **COMPLIANCE VERIFICATION**: Ensure all amendments comply with configuration location requirements
- **BACKUP INTEGRATION**: Ensure amendments integrate with existing backup systems

#### 13.5.2 Maintenance Requirements
- **REGULAR AUDITS**: Regular verification of configuration location compliance
- **BACKUP MAINTENANCE**: Regular maintenance of backup systems for configurations
- **VERSION CONTROL MAINTENANCE**: Regular maintenance of version control systems for configurations
- **FUNCTIONALITY MAINTENANCE**: Regular updates to ensure configurations work correctly

--- *Established: December 30, 2025* *Section: Opencode Configuration Location Requirements* *Integration: Complete Opencode configuration management framework with zero tolerance for home directory configurations* *Enforcement: Mandatory project directory storage for all Opencode configurations*

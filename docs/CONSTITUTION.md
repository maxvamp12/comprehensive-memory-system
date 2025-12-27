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
3. **Compliance Check**: Verify constitution and protocol compliance
4. **Risk Assessment**: Evaluate current state risks and issues
5. **Certification**: Issue phase completion certification
6. **Context Update**: Update SESSION_RESUME_CONTEXT.md with findings

##### 10.6.3 Checkpoint Success Criteria
- **Evidence Coverage**: 100% of audit claims have physical evidence
- **Documentation Accuracy**: 100% match between documentation and reality
- **Compliance Verification**: 100% compliance with all protocols
- **Risk Mitigation**: All critical risks addressed or documented
- **System Stability**: System remains stable and operational
- **Readiness Certification**: Phase ready for progression

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
3. **Audit Report Generation**: Create comprehensive audit document
4. **Summary Display**: Show summary to user with document location
5. **Context Update**: Update SESSION_RESUME_CONTEXT.md
6. **Constitution Reading**: Read constitution to preserve context
7. **Phase Certification**: Certify phase completion
8. **Progression**: Allow progression to next phase

##### 10.8.2 Mandatory Audits
- **Phase 1 Audit**: Integration Foundation audit
- **Phase 2 Audit**: Service Mesh Implementation audit
- **Phase 3 Audit**: Optimization and Enhancement audit
- **Milestone Audits**: Any major system milestone completion

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

*Established: December 26, 2025*
*Section: Verification Protocols and Documentation*
*Integration: Complete system audit framework*
*Established: December 22, 2025*
*Amendment Process: Requires explicit consensus for changes*
*Last Amendment: December 26, 2025 - Added Implementation and Documentation Standards (Evidence-based and verification-driven principles)*
*Previous Amendment: December 25, 2025 - Added Memory Service Replacement Policy and Source Code Classification*
*Vital Amendment: December 25, 2025 - Added System Operational Protocols (vLLM Cluster Restrictions, Startup Protocol, Context Management)*
*Critical Amendment: December 25, 2025 - Added AI Commit Restrictions (No commits without explicit user review)*
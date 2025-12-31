# AGENTS.md - Comprehensive Memory System

## Build/Dev Commands
- BMAD framework only - no traditional build system
- Use `@bmad/{module}/{type}/{name}` syntax for agent/workflow references
- Testing via BMAD workflows: `@bmm/testarch/*` (framework, design, review, CI)

## Code Style Guidelines
- **Naming**: kebab-case workflows, snake_case agents, PascalCase core agents
- **Imports**: Follow BMAD module structure (core/bmb/bmgd/bmm/cis)
- **Formatting**: Consistent YAML configuration format
- **Types**: No explicit typing - YAML configuration and markdown docs only
- **Error Handling**: BMAD workflow compliance checks + agent-specific handling

## BMAD Framework Rules
- Reference agents: `@bmad/{module}/agents/{agent-name}`
- Reference workflows: `@bmad/{module}/workflows/{workflow-name}`  
- Reference tools: `@bmad/{module}/tools/{tool-name}`
- Manual rules only - alwaysApply: false for all rules
- Module hierarchy: core → bmb → bmgd → bmm → cis

## Cursor Rules
- Located in `.cursor/rules/bmad/` directory
- Use `@bmad/index` for master reference
- Each agent has activation block for proper initialization
- Reference specific rules using BMAD syntax

## Important Notes
- No package.json or traditional build tools
- Focus on agent-based development and workflow orchestration
- Use existing agent configurations in `_bmad/_config/` as templates
- Follow BMAD workflow patterns for consistency
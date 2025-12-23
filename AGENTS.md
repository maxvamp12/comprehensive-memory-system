# AGENTS.md - Comprehensive Memory System

## Build/Dev Commands
- No traditional build system found - this is a BMAD (Business Method Agent Development) framework
- Development focuses on agent workflows and configurations
- Use `@bmad/{module}/{type}/{name}` syntax to reference specific agents/tasks/workflows

## Code Style Guidelines
- **Naming**: kebab-case for workflows, snake_case for agents, PascalCase for core agents
- **Imports**: Follow BMAD module structure (core/bmb/bmgd/bmm/cis)
- **Formatting**: Use consistent YAML configuration format
- **Types**: No explicit typing - rely on YAML configuration and markdown documentation
- **Error Handling**: Use BMAD workflow compliance checks and agent-specific error handling

## BMAD Framework Rules
- Reference agents: `@bmad/{module}/agents/{agent-name}`
- Reference workflows: `@bmad/{module}/workflows/{workflow-name}`  
- Reference tools: `@bmad/{module}/tools/{tool-name}`
- Manual rules only - alwaysApply: false for all BMAD rules
- Follow module hierarchy: core → bmb → bmgd → bmm → cis

## Cursor Rules
- Located in `.cursor/rules/bmad/` directory
- Use `@bmad/index` for master reference
- Each agent has activation block for proper initialization
- Reference specific rules using BMAD syntax

## Important Notes
- No package.json or traditional build tools found
- Focus is on agent-based development and workflow orchestration
- Use existing agent configurations in `_bmad/_config/` as templates
- Follow BMAD workflow patterns for consistency
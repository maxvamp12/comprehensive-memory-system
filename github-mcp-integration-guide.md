# GitHub MCP Server Integration Guide

## 🎯 Overview

This guide documents the integration of the GitHub MCP Server into the OpenCode coding agent environment, enabling comprehensive GitHub operations through natural language interactions.

## ✅ Installation Status

### Configuration Files Updated
- **`.mcp.json`**: Added GitHub MCP server configuration
- **`.opencode/opencode.jsonc`**: Added GitHub MCP server configuration
- **`test-github-mcp.sh`**: Created test script for validation

### Docker Environment
- ✅ Docker Desktop is running
- ✅ GitHub MCP server image pulled successfully
- ✅ Docker daemon is operational

## 🔧 Configuration Details

### GitHub MCP Server Setup

#### MCP Configuration (`.mcp.json`)
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN=${input:github_token}",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
      },
      "inputs": [
        {
          "type": "promptString",
          "name": "github_token",
          "description": "GitHub Personal Access Token",
          "required": true
        }
      ]
    }
  }
}
```

#### OpenCode Configuration (`.opencode/opencode.jsonc`)
```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["docker", "run", "-i", "--rm"],
      "args": [
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN=${input:github_token}",
        "ghcr.io/github/github-mcp-server"
      ],
      "environment": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
      },
      "inputs": [
        {
          "type": "promptString",
          "name": "github_token",
          "description": "GitHub Personal Access Token",
          "required": true
        }
      ]
    }
  }
}
```

## 🔐 Authentication Setup

### GitHub Personal Access Token Requirements

1. **Create PAT**: Visit https://github.com/settings/tokens
2. **Required Scopes**:
   - `repo` - Repository operations
   - `read:packages` - Docker image access
   - `read:org` - Organization team access

### Security Best Practices

- **Token Scope**: Grant only necessary permissions
- **Token Management**: Use different tokens for different projects
- **Token Rotation**: Update tokens periodically
- **Storage**: Never commit tokens to version control

## 🚀 Usage Instructions

### 1. Initial Setup
```bash
# Create GitHub Personal Access Token
# Visit: https://github.com/settings/tokens
```

### 2. Restart OpenCode Agent
```bash
# Restart your coding agent to load new MCP configuration
# The agent will prompt for GitHub PAT when needed
```

### 3. Available GitHub Operations

Once authenticated, you can perform GitHub operations through natural language:

#### Repository Management
- Browse and query code
- Search files across repositories
- Analyze commits and project structure
- Manage repository branches and releases

#### Issue & PR Management
- Create, update, and manage issues
- Handle pull requests (create, review, merge)
- Add comments and review code changes
- Manage project boards

#### CI/CD & Workflows
- Monitor GitHub Actions workflow runs
- Analyze build failures
- Manage releases
- Get insights into development pipelines

#### Code Analysis
- Examine security findings
- Review Dependabot alerts
- Understand code patterns
- Get comprehensive codebase insights

## 📋 Available Toolsets

The GitHub MCP Server provides extensive toolsets:

### Core Toolsets
- **`repos`** - Repository operations
- **`issues`** - Issue management
- **`pull_requests`** - Pull request handling
- **`actions`** - GitHub Actions workflows
- **`users`** - User management
- **`context`** - User and GitHub context

### Advanced Toolsets
- **`code_security`** - Code security scanning
- **`dependabot`** - Dependabot tools
- **`discussions`** - GitHub Discussions
- **`gists`** - GitHub Gists
- **`git`** - Low-level Git operations
- **`labels`** - Label management
- **`notifications`** - Notifications
- **`orgs`** - Organization management
- **`projects`** - Project management
- **`stargazers`** - Stargazer management
- **`secret_protection`** - Secret scanning
- **`security_advisories`** - Security advisories

### Remote Server Additional Toolsets
- **`copilot`** - Copilot tools
- **`copilot_spaces`** - Copilot Spaces
- **`github_support_docs_search`** - GitHub documentation search

## 🔧 Troubleshooting

### Common Issues

#### Docker Daemon Not Running
```bash
# Start Docker Desktop
open -a "Docker Desktop"
```

#### Image Pull Fails
```bash
# Re-pull the image
docker pull ghcr.io/github/github-mcp-server:latest
```

#### Authentication Issues
- Verify PAT has correct scopes
- Check PAT expiration date
- Ensure PAT is not revoked

### Validation Commands

#### Test Docker Connection
```bash
docker info
```

#### Test GitHub MCP Server
```bash
docker run --rm ghcr.io/github/github-mcp-server --help
```

## 📊 Integration Benefits

### Enhanced GitHub Operations
- **Natural Language**: Perform GitHub operations through conversational commands
- **Comprehensive Access**: Full GitHub API coverage
- **Streamlined Workflows**: Automate GitHub processes
- **Intelligent Code Analysis**: Advanced code insights and security analysis

### Productivity Improvements
- **Reduced Context Switching**: Stay within your coding environment
- **Automated Tasks**: GitHub operations through natural language
- **Enhanced Collaboration**: Better team workflow management
- **Code Quality**: Advanced security scanning and code review

## 🔄 Next Steps

1. **Complete Setup**: Create GitHub PAT and restart agent
2. **Test Integration**: Verify GitHub operations work through OpenCode
3. **Configure Toolsets**: Enable specific toolsets based on needs
4. **Explore Features**: Test available GitHub operations
5. **Documentation**: Document specific workflows and processes

---

*Status: ✅ Installation Complete - GitHub MCP Server Ready for Use*
*Next Action: Create GitHub PAT and restart OpenCode agent to enable GitHub operations*
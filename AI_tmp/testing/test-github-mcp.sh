#!/bin/bash

# GitHub MCP Server Test Script
# This script tests the GitHub MCP server configuration

echo "🚀 Testing GitHub MCP Server Configuration..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

# Check if GitHub MCP server image is available
if ! docker image inspect ghcr.io/github/github-mcp-server:latest >/dev/null 2>&1; then
    echo "❌ GitHub MCP server image not found. Pulling..."
    docker pull ghcr.io/github/github-mcp-server:latest
fi

echo "✅ GitHub MCP server image is available"
echo "📝 To use the GitHub MCP server, you need to provide a GitHub Personal Access Token"
echo "🔑 Create a PAT at: https://github.com/settings/tokens"
echo "🛡️ Required scopes: repo, read:packages, read:org"
echo ""
echo "📋 Configuration Summary:"
echo "   - MCP Server: github"
echo "   - Type: local (Docker)"
echo "   - Image: ghcr.io/github/github-mcp-server:latest"
echo "   - Authentication: GitHub Personal Access Token"
echo ""
echo "🔄 Next steps:"
echo "   1. Create a GitHub PAT with the required scopes"
echo "   2. Restart your coding agent to load the new MCP configuration"
echo "   3. When prompted, enter your GitHub PAT to authenticate"
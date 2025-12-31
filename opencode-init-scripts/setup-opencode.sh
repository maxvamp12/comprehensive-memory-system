#!/bin/bash
# ==============================================================================
# OpenCode Configuration Setup Script
# ==============================================================================
# Creates .opencode folder structure with GLM provider, MCP servers, and LSP configs
# Run this script from any project directory to set up OpenCode configuration
#
# Usage: ./setup-opencode.sh [target-directory]
#   If no target is specified, uses current directory
#
# Created: December 31, 2025
# ==============================================================================

set -e

# Target directory (default: current directory)
TARGET_DIR="${1:-.}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}OpenCode Configuration Setup${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Resolve to absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)
OPENCODE_DIR="$TARGET_DIR/.opencode"

echo -e "${YELLOW}Target directory:${NC} $TARGET_DIR"
echo -e "${YELLOW}OpenCode config:${NC} $OPENCODE_DIR"
echo ""

# Check if .opencode already exists
if [ -d "$OPENCODE_DIR" ]; then
    echo -e "${RED}Warning:${NC} .opencode directory already exists!"
    read -p "Overwrite existing configuration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
fi

# Create directory structure
echo -e "${GREEN}Creating directory structure...${NC}"
mkdir -p "$OPENCODE_DIR"
mkdir -p "$OPENCODE_DIR/mcp"

# ==============================================================================
# Create opencode.json - Main configuration file
# ==============================================================================
echo -e "${GREEN}Creating opencode.json...${NC}"
cat > "$OPENCODE_DIR/opencode.json" << 'OPENCODE_JSON_EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "model": "glm/GLM-4.5-Air",
  "small_model": "glm/GLM-4.5-Air",
  "provider": {
    "glm": {
      "name": "GLM (SARK Cluster - vLLM)",
      "npm": "@ai-sdk/openai-compatible",
      "api": "http://192.168.68.69:8080",
      "env": [
        "GLM_API_KEY"
      ],
      "options": {
        "baseURL": "http://192.168.68.69:8080/v1",
        "apiKey": "not-needed"
      },
      "models": {
        "GLM-4.5-Air": {
          "id": "GLM-4.5-Air",
          "name": "GLM-4.5-Air (SARK - Tensor Parallel)",
          "temperature": true,
          "reasoning": true,
          "attachment": false,
          "tool_call": true,
          "cost": {
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0
          },
          "limit": {
            "context": 131072,
            "output": 16384
          },
          "modalities": {
            "input": [
              "text"
            ],
            "output": [
              "text"
            ]
          },
          "options": {}
        }
      }
    },
    "opencode": {
      "name": "OpenCode Local",
      "options": {
        "baseURL": "http://localhost:8080"
      }
    }
  },
  "mcp": {
    "mcp-ssh": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@aiondadotcom/mcp-ssh"
      ],
      "enabled": true
    },
    "exa": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp",
      "enabled": true
    },
    "morph": {
      "type": "local",
      "command": [
        "bunx",
        "@morphllm/morphmcp"
      ],
      "enabled": true,
      "environment": {
        "ENABLED_TOOLS": "warp_grep"
      }
    },
    "github": {
      "type": "local",
      "command": [
        "docker",
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "enabled": true,
      "environment": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "memory-system": {
      "type": "remote",
      "url": "http://192.168.68.71:8200/sse",
      "enabled": true
    }
  },
  "lsp": {
    "java": {
      "enabled": true,
      "command": [
        "jdtls"
      ],
      "extensions": [
        ".java",
        ".jav",
        ".class"
      ],
      "initialization": {
        "java": {
          "format": {
            "enabled": true,
            "url": "https://github.com/google/google-java-format",
            "version": "1.18.1"
          }
        }
      }
    },
    "c": {
      "enabled": true,
      "command": [
        "clangd"
      ],
      "extensions": [
        ".c",
        ".h"
      ],
      "environment": {
        "CLANGD_FLAGS": "--log=verbose"
      }
    },
    "cpp": {
      "enabled": true,
      "command": [
        "clangd"
      ],
      "extensions": [
        ".cpp",
        ".cxx",
        ".cc",
        ".hpp",
        ".hxx",
        ".hh"
      ],
      "environment": {
        "CLANGD_FLAGS": "--log=verbose"
      }
    },
    "csharp": {
      "enabled": true,
      "command": [
        "omnisharp"
      ],
      "extensions": [
        ".cs",
        ".csx"
      ],
      "environment": {
        "OMNISHARP": "1"
      }
    },
    "rust": {
      "enabled": true,
      "command": [
        "rust-analyzer"
      ],
      "extensions": [
        ".rs"
      ],
      "initialization": {
        "rust-analyzer": {
          "cargo": {
            "loadOutDirsFromCheck": true
          },
          "checkOnSave": {
            "command": "clippy"
          }
        }
      }
    },
    "swift": {
      "enabled": true,
      "command": [
        "sourcekit-lsp"
      ],
      "extensions": [
        ".swift",
        ".swiftinterface"
      ],
      "environment": {
        "SOURCEKIT_LSP_LOG_LEVEL": "info"
      }
    },
    "sql": {
      "enabled": true,
      "command": [
        "sqls"
      ],
      "extensions": [
        ".sql",
        ".ddl",
        ".dml"
      ],
      "environment": {
        "SQLS_CONNECTIONS": "mysql://user:pass@localhost:3306/db,postgresql://user:pass@localhost:5432/db"
      }
    },
    "typescript": {
      "enabled": true,
      "command": [
        "typescript-language-server",
        "--stdio"
      ],
      "extensions": [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs"
      ],
      "environment": {
        "TSSERVER_LOG_LEVEL": "verbose"
      }
    },
    "javascript": {
      "enabled": true,
      "command": [
        "typescript-language-server",
        "--stdio"
      ],
      "extensions": [
        ".js",
        ".jsx",
        ".mjs",
        ".cjs"
      ],
      "environment": {
        "TSSERVER_LOG_LEVEL": "verbose"
      }
    },
    "python": {
      "enabled": true,
      "command": [
        "pylsp"
      ],
      "extensions": [
        ".py",
        ".pyi",
        ".pyw"
      ],
      "initialization": {
        "pylsp": {
          "plugins": {
            "pyflakes": {
              "enabled": true
            },
            "pycodestyle": {
              "enabled": false
            },
            "flake8": {
              "enabled": true,
              "maxLineLength": 88
            }
          }
        }
      }
    },
    "go": {
      "enabled": true,
      "command": [
        "gopls"
      ],
      "extensions": [
        ".go"
      ],
      "environment": {
        "GOPATH": "${GOPATH:-/tmp/gopath}"
      }
    },
    "rexx": {
      "enabled": true,
      "command": [
        "ls4rexx"
      ],
      "extensions": [
        ".rex",
        ".rexx",
        ".zrx",
        ".rxj"
      ],
      "environment": {
        "LS4REXX_LOG_LEVEL": "info"
      }
    },
    "bash": {
      "enabled": true,
      "command": [
        "bash-language-server",
        "start"
      ],
      "extensions": [
        ".sh",
        ".bash",
        ".ksh",
        ".zsh"
      ],
      "environment": {
        "BASH_LANGUAGE_SERVER_LOG_LEVEL": "info"
      }
    },
    "yaml": {
      "enabled": true,
      "command": [
        "yaml-language-server",
        "--stdio"
      ],
      "extensions": [
        ".yaml",
        ".yml"
      ],
      "environment": {
        "YAML_LANGUAGE_SERVER_LOG_LEVEL": "info"
      }
    },
    "json": {
      "enabled": true,
      "command": [
        "vscode-json-language-server",
        "--stdio"
      ],
      "extensions": [
        ".json",
        ".jsonc"
      ],
      "environment": {
        "JSON_LS_LOG_LEVEL": "info"
      }
    },
    "html": {
      "enabled": true,
      "command": [
        "vscode-html-language-server",
        "--stdio"
      ],
      "extensions": [
        ".html",
        ".htm",
        ".xhtml"
      ],
      "environment": {
        "HTML_LS_LOG_LEVEL": "info"
      }
    },
    "css": {
      "enabled": true,
      "command": [
        "vscode-css-language-server",
        "--stdio"
      ],
      "extensions": [
        ".css",
        ".scss",
        ".sass",
        ".less"
      ],
      "environment": {
        "CSS_LS_LOG_LEVEL": "info"
      }
    },
    "dockerfile": {
      "enabled": true,
      "command": [
        "dockerfile-language-server-nodejs",
        "--stdio"
      ],
      "extensions": [
        ".dockerfile",
        "Dockerfile",
        "docker-compose.yml"
      ],
      "environment": {
        "DOCKER_LS_LOG_LEVEL": "info"
      }
    },
    "toml": {
      "enabled": true,
      "command": [
        "taplo",
        "lsp"
      ],
      "extensions": [
        ".toml"
      ],
      "environment": {
        "TAPLO_LOG_LEVEL": "info"
      }
    },
    "xml": {
      "enabled": true,
      "command": [
        "vscode-xml-language-server",
        "--stdio"
      ],
      "extensions": [
        ".xml",
        ".xsd",
        ".xsl",
        ".dtd"
      ],
      "environment": {
        "XML_LS_LOG_LEVEL": "info"
      }
    }
  },
  "agent": {
    "build": {
      "model": "glm/GLM-4.5-Air",
      "temperature": 0.7,
      "description": "Full-access agent for development work using GLM-4.5-Air",
      "permission": {
        "edit": "allow",
        "bash": "allow",
        "webfetch": "allow",
        "external_directory": "ask"
      }
    },
    "plan": {
      "model": "glm/GLM-4.5-Air",
      "temperature": 0.5,
      "description": "Read-only agent for code exploration and planning",
      "permission": {
        "edit": "deny",
        "bash": "ask",
        "webfetch": "allow",
        "external_directory": "deny"
      }
    },
    "general": {
      "model": "glm/GLM-4.5-Air",
      "temperature": 0.7,
      "description": "General purpose subagent for complex tasks"
    }
  },
  "disabled_providers": [
    "anthropic",
    "openai",
    "google",
    "github-copilot"
  ],
  "enabled_providers": [
    "glm",
    "opencode"
  ],
  "autoupdate": false,
  "share": "manual",
  "instructions": [
    "MEMORY_INSTRUCTIONS.md"
  ]
}
OPENCODE_JSON_EOF

# ==============================================================================
# Create .gitignore
# ==============================================================================
echo -e "${GREEN}Creating .opencode/.gitignore...${NC}"
cat > "$OPENCODE_DIR/.gitignore" << 'GITIGNORE_EOF'
node_modules
bun.lock
GITIGNORE_EOF

# ==============================================================================
# Create package.json (empty, placeholder for npm dependencies)
# ==============================================================================
echo -e "${GREEN}Creating .opencode/package.json...${NC}"
cat > "$OPENCODE_DIR/package.json" << 'PACKAGE_JSON_EOF'
{}
PACKAGE_JSON_EOF

# ==============================================================================
# Create MEMORY_INSTRUCTIONS.md in project root
# ==============================================================================
MEMORY_INSTRUCTIONS_FILE="$TARGET_DIR/MEMORY_INSTRUCTIONS.md"
if [ ! -f "$MEMORY_INSTRUCTIONS_FILE" ]; then
    echo -e "${GREEN}Creating MEMORY_INSTRUCTIONS.md...${NC}"
    cat > "$MEMORY_INSTRUCTIONS_FILE" << 'MEMORY_INSTRUCTIONS_EOF'
# Memory System Instructions

## Memory-First Search Protocol

**IMPORTANT**: Before using web search (exa) or other external search tools, ALWAYS check the local memory system first.

### Search Priority Order:
1. **FIRST**: Use `retrieve_memories` or `search_memories_advanced` from the memory-system MCP
2. **SECOND**: If memory doesn't have relevant information, then use web search (exa)
3. **THIRD**: Use other external tools as needed

### When to Store Memories:
- Store important facts, preferences, and decisions the user shares
- Store technical solutions and code patterns discussed
- Store project-specific context and requirements
- Use appropriate domains:
  - `bmad_code`: Programming, development, BMAD methodology
  - `website_info`: Web content, URLs, online resources
  - `religious_discussions`: Theological and spiritual topics
  - `electronics_maker`: Hardware, circuits, maker projects

### Memory Tools Available:
- `store_memory`: Save new information to memory
- `retrieve_memories`: Search and retrieve stored memories
- `search_memories_advanced`: Advanced search with filters
- `get_memory_statistics`: Check what's stored in memory
- `expand_keywords`: Get related search terms for a domain

### Example Usage:
When user asks a question:
1. First call `retrieve_memories` with relevant keywords
2. If no results, try `search_memories_advanced` with broader terms
3. Only if memory has no relevant data, use external search
4. After finding useful information externally, consider storing it with `store_memory`
MEMORY_INSTRUCTIONS_EOF
else
    echo -e "${YELLOW}MEMORY_INSTRUCTIONS.md already exists, skipping...${NC}"
fi

# ==============================================================================
# Create SESSION_SUMMARY.md in project root (empty placeholder)
# ==============================================================================
SESSION_SUMMARY_FILE="$TARGET_DIR/SESSION_SUMMARY.md"
if [ ! -f "$SESSION_SUMMARY_FILE" ]; then
    echo -e "${GREEN}Creating SESSION_SUMMARY.md...${NC}"
    cat > "$SESSION_SUMMARY_FILE" << 'SESSION_SUMMARY_EOF'
# Session Summary

<!-- This file is used to capture session summaries and context for AI assistants -->
<!-- Update this file at the end of each development session -->

## Current Session

**Date**:
**Focus**:

## Key Decisions

## Progress Made

## Next Steps

## Notes

SESSION_SUMMARY_EOF
else
    echo -e "${YELLOW}SESSION_SUMMARY.md already exists, skipping...${NC}"
fi

# ==============================================================================
# Create CONSTITUTION.md in project root (empty placeholder)
# ==============================================================================
CONSTITUTION_FILE="$TARGET_DIR/CONSTITUTION.md"
if [ ! -f "$CONSTITUTION_FILE" ]; then
    echo -e "${GREEN}Creating CONSTITUTION.md...${NC}"
    cat > "$CONSTITUTION_FILE" << 'CONSTITUTION_EOF'
# Project Constitution

<!-- This file defines project governance, principles, and operational guidelines -->
<!-- Customize this for your project's specific needs -->

## Core Principles

## Operational Guidelines

## Development Standards

## Quality Requirements

## Documentation Requirements

CONSTITUTION_EOF
else
    echo -e "${YELLOW}CONSTITUTION.md already exists, skipping...${NC}"
fi

# ==============================================================================
# Summary and Next Steps
# ==============================================================================
echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "${GREEN}Created files:${NC}"
echo "  $OPENCODE_DIR/opencode.json"
echo "  $OPENCODE_DIR/.gitignore"
echo "  $OPENCODE_DIR/package.json"
echo "  $OPENCODE_DIR/mcp/ (directory)"
echo "  $TARGET_DIR/MEMORY_INSTRUCTIONS.md"
echo "  $TARGET_DIR/SESSION_SUMMARY.md"
echo "  $TARGET_DIR/CONSTITUTION.md"
echo ""
echo -e "${YELLOW}Configuration includes:${NC}"
echo "  - GLM provider (SARK:8080 vLLM cluster)"
echo "  - MCP servers: mcp-ssh, exa, morph, github, memory-system (CLU:8200)"
echo "  - LSP configs: 18 languages (TypeScript, Python, Rust, Go, etc.)"
echo "  - Agent configs: build, plan, general"
echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "  - GLM vLLM cluster running on SARK (192.168.68.69:8080)"
echo "  - MCP Memory Server running on CLU (192.168.68.71:8200)"
echo "  - ChromaDB running on SARK (192.168.68.69:8001)"
echo "  - GITHUB_TOKEN environment variable set for GitHub MCP"
echo "  - Docker installed for GitHub MCP server"
echo "  - Node.js/npm for mcp-ssh"
echo "  - Bun for morph MCP"
echo ""
echo -e "${YELLOW}To customize:${NC}"
echo "  Edit $OPENCODE_DIR/opencode.json"
echo ""
echo -e "${GREEN}Ready to use OpenCode in this project!${NC}"

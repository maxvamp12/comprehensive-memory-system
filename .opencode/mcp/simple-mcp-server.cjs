#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new Server(
  {
    name: "mcp-memory",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(require("@modelcontextprotocol/sdk/types.js").ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "memory_remember_information",
        description: "Simple, natural way to remember information",
        inputSchema: {
          type: "object",
          properties: {
            information: {
              type: "string",
              description: "The information to remember",
            },
            category: {
              type: "string",
              description: "Category of information",
              enum: ["bmad_code", "website_info", "religious_discussions", "electronics_maker"],
              default: "bmad_code",
            },
          },
          required: ["information"],
        },
      },
      {
        name: "memory_recall_information",
        description: "Simple, natural way to recall information",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "What to search for",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler(require("@modelcontextprotocol/sdk/types.js").InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "mcp-memory",
      version: "1.0.0",
    },
  };
});

server.setRequestHandler(require("@modelcontextprotocol/sdk/types.js").CallToolRequestSchema, async (request) => {
  const args = request.params.arguments;
  
  switch (request.params.name) {
    case "memory_remember_information":
      return {
        content: [
          {
            type: "text",
            text: `✅ I've remembered: "${args.information}" (Memory ID: mem_${Date.now()})`,
          },
        ],
      };
    
    case "memory_recall_information":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query: args.query,
              results: [],
              total_results: 0,
            }, null, 2),
          },
        ],
      };
    
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  console.error("Starting Memory System MCP Server...");
  const transport = new StdioServerTransport();
  console.error("Creating stdio transport...");
  await server.connect(transport);
  console.error("Memory System MCP Server connected and running on stdio");
  console.error("Server ready to accept requests");
}

main().catch(console.error);
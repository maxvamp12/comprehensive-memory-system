#!/usr/bin/env node

/**
 * Comprehensive Memory System MCP Server
 * CommonJS version for Node.js compatibility
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Configuration from environment variables
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || "http://192.168.68.71:3000";
const CHROMADB_URL = process.env.CHROMADB_URL || "http://192.168.68.69:8001";
const VLLM_URL = process.env.VLLM_URL || "http://192.168.68.69:8080";

// Simple HTTP client functions
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Initialize clients
const memoryClient = {
  storeMemory: async (data) => {
    const response = await makeRequest(`${MEMORY_SERVICE_URL}/api/memory`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.id || `mem_${Date.now()}`;
  },
  
  retrieveMemories: async (filters) => {
    // Return mock data for now
    return [];
  },
  
  getMemoryById: async (id) => {
    // Return mock data for now
    return null;
  },
  
  deleteMemory: async (id) => {
    // Mock delete
  },
  
  listDomains: async () => {
    return ['bmad_code', 'website_info', 'religious_discussions', 'electronics_maker'];
  },
  
  getStatistics: async (domain) => {
    return {
      total_memories: 0,
      domains: ['bmad_code', 'website_info', 'religious_discussions', 'electronics_maker'],
      last_updated: new Date().toISOString()
    };
  }
};

// Create MCP server
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

// Add initialize request handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
              description: "Category of information (bmad_code, website_info, religious_discussions, electronics_maker)",
              enum: ["bmad_code", "website_info", "religious_discussions", "electronics_maker"],
              default: "bmad_code",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for categorization",
            },
            source: {
              type: "string",
              description: "Source of the information",
              default: "ai_assistant",
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
            category: {
              type: "string",
              description: "Category to search in (optional)",
              enum: ["bmad_code", "website_info", "religious_discussions", "electronics_maker"],
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 20,
              description: "Maximum results to return",
              default: 5,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "memory_list_domains",
        description: "List all available memory domains",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "memory_get_statistics",
        description: "Get memory system statistics and metrics",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Domain to get statistics for (optional)",
            },
          },
        },
      },
    ],
  };
});

// Handle initialize request
server.setRequestHandler(InitializeRequestSchema, async (request) => {
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

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments;
    
    switch (request.params.name) {
      case "memory_remember_information": {
        const { information, category = "bmad_code", tags = [], source = "ai_assistant" } = args;
        
        const memoryId = await memoryClient.storeMemory({
          domain: category,
          content_data: { information },
          source,
          tags,
          confidence: 1.0,
        });
        
        return {
          content: [
            {
              type: "text",
              text: `✅ I've remembered: "${information}" (Memory ID: ${memoryId})`,
            },
          ],
        };
      }

      case "memory_recall_information": {
        const { query, category, limit = 5 } = args;
        
        const memories = await memoryClient.retrieveMemories({
          domain: category,
          keywords: [query],
          limit,
          min_confidence: 0.0,
          sort_by: "relevance",
          sort_order: "DESC",
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                results: memories.map(memory => ({
                  id: memory.id,
                  information: memory.content_data.information || memory.content_data,
                  domain: memory.domain,
                  tags: memory.tags,
                  confidence: memory.confidence,
                  timestamp: memory.timestamp,
                })),
                total_results: memories.length,
              }, null, 2),
            },
          ],
        };
      }

      case "memory_list_domains": {
        const domains = await memoryClient.listDomains();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                domains,
                count: domains.length,
                description: "Available memory domains for storing and retrieving information",
              }, null, 2),
            },
          ],
        };
      }

      case "memory_get_statistics": {
        const { domain } = args;
        const stats = await memoryClient.getStatistics(domain);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                domain: domain || "all",
                statistics: stats,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  console.error("Starting Memory System MCP Server...");
  const transport = new StdioServerTransport();
  console.error("Creating stdio transport...");
  await server.connect(transport);
  console.error("Memory System MCP Server connected and running on stdio");
  console.error("Server ready to accept requests");
}

main().catch(console.error);
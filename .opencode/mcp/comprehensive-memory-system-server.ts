#!/usr/bin/env bun
/**
 * Comprehensive Memory System MCP Server
 * 
 * This MCP server provides full access to the Comprehensive Memory System
 * for any AI coding assistant through the Model Context Protocol.
 * 
 * Features:
 * - Memory storage and retrieval
 * - Multi-domain memory management
 * - Semantic search capabilities
 * - RAG (Retrieval Augmented Generation) integration
 * - Evidence-based memory anchoring
 * - Multi-domain support (BMAD Code, Website Info, Religious Discussions, Electronics Maker)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment variables
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || "http://192.168.68.71:3000";
const CHROMADB_URL = process.env.CHROMADB_URL || "http://192.168.68.69:8001";
const VLLM_URL = process.env.VLLM_URL || "http://192.168.68.69:8080";

// Import client implementations
import { createClient as createMemoryClient } from "./clients/memory-system-client.js";
import { createClient as createChromaDBClient } from "./clients/chromadb-client.js";
import { createClient as createVLLMClient } from "./clients/vllm-client.js";

// Initialize clients
const memoryClient = createMemoryClient(MEMORY_SERVICE_URL);
const chromaClient = createChromaDBClient(CHROMADB_URL);
const vllmClient = createVLLMClient(VLLM_URL);

// Create MCP server
const server = new Server(
  {
    name: "comprehensive-memory-system",
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
        name: "memory_store_information",
        description: "Store information in the memory system with domain-specific validation",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Memory domain: 'bmad_code', 'website_info', 'religious_discussions', 'electronics_maker'",
              enum: ["bmad_code", "website_info", "religious_discussions", "electronics_maker"],
            },
            content_data: {
              type: "object",
              description: "The actual content data to store (structured by domain)",
            },
            source: {
              type: "string",
              description: "Source of the information (e.g., 'code-review', 'web-scraper', 'user-input')",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for categorization and search",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence score in the information (0.0 to 1.0)",
              default: 1.0,
            },
            subdomain: {
              type: "string",
              description: "Optional subdomain for further categorization",
            },
          },
          required: ["domain", "content_data"],
        },
      },
      {
        name: "memory_retrieve_information",
        description: "Retrieve stored information from the memory system",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Domain to search in (leave empty for all domains)",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords to search for",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to filter by",
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 100,
              description: "Maximum number of results to return",
              default: 10,
            },
            min_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Minimum confidence threshold",
              default: 0.0,
            },
            sort_by: {
              type: "string",
              enum: ["timestamp", "confidence", "relevance"],
              description: "Field to sort results by",
              default: "timestamp",
            },
            sort_order: {
              type: "string",
              enum: ["ASC", "DESC"],
              description: "Sort order",
              default: "DESC",
            },
          },
        },
      },
      {
        name: "memory_verify_existence",
        description: "Check if specific information exists in the memory system",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Domain to check in (leave empty for all domains)",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords to verify existence of",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to verify",
            },
            memory_id: {
              type: "string",
              description: "Specific memory ID to check (optional)",
            },
          },
        },
      },
      {
        name: "memory_delete_information",
        description: "Delete information from the memory system",
        inputSchema: {
          type: "object",
          properties: {
            memory_id: {
              type: "string",
              description: "Specific memory ID to delete",
            },
            domain: {
              type: "string",
              description: "Domain to delete from (optional, used with filters)",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags to match for deletion (optional)",
            },
            confirmation: {
              type: "boolean",
              description: "Require confirmation for deletion",
              default: false,
            },
          },
          required: ["memory_id"],
        },
      },
      {
        name: "memory_semantic_search",
        description: "Perform semantic search using vector embeddings",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query text",
            },
            domain: {
              type: "string",
              description: "Domain to search in (leave empty for all domains)",
            },
            n_results: {
              type: "number",
              minimum: 1,
              maximum: 50,
              description: "Number of results to return",
              default: 5,
            },
            collection_name: {
              type: "string",
              description: "ChromaDB collection name (optional)",
              default: "memories",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "memory_rag_generate",
        description: "Generate text using retrieved memories for context",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Text generation prompt",
            },
            context_memories: {
              type: "array",
              items: { type: "string" },
              description: "Memory IDs to use as context (optional)",
            },
            domain: {
              type: "string",
              description: "Domain to focus context on (optional)",
            },
            max_tokens: {
              type: "number",
              minimum: 100,
              maximum: 4000,
              description: "Maximum tokens to generate",
              default: 1000,
            },
            temperature: {
              type: "number",
              minimum: 0,
              maximum: 2,
              description: "Generation temperature",
              default: 0.7,
            },
          },
          required: ["prompt"],
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
      name: "comprehensive-memory-system",
      version: "1.0.0",
    },
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments as any;
    
    switch (request.params.name) {
      case "memory_store_information": {
        const { domain, content_data, source, tags = [], confidence = 1.0, subdomain } = args;
        
        // Validate domain
        const validDomains = ["bmad_code", "website_info", "religious_discussions", "electronics_maker"];
        if (!validDomains.includes(domain)) {
          throw new Error(`Invalid domain: ${domain}. Must be one of: ${validDomains.join(', ')}`);
        }
        
        // Store the memory
        const memoryId = await memoryClient.storeMemory({
          domain,
          content_data,
          source,
          tags,
          confidence,
          subdomain,
        });
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully stored information with memory ID: ${memoryId}`,
            },
          ],
        };
      }

      case "memory_retrieve_information": {
        const { domain, keywords = [], tags = [], limit = 10, min_confidence = 0.0, sort_by = "timestamp", sort_order = "DESC" } = args;
        
        const memories = await memoryClient.retrieveMemories({
          domain,
          keywords,
          tags,
          limit,
          min_confidence,
          sort_by,
          sort_order,
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total_count: memories.length,
                memories: memories.map(memory => ({
                  id: memory.id,
                  domain: memory.domain,
                  content_data: memory.content_data,
                  tags: memory.tags,
                  confidence: memory.confidence,
                  timestamp: memory.timestamp,
                  source: memory.source,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case "memory_verify_existence": {
        const { domain, keywords = [], tags = [], memory_id } = args;
        
        let exists = false;
        let count = 0;
        
        if (memory_id) {
          // Check specific memory ID
          const memory = await memoryClient.getMemoryById(memory_id);
          exists = memory !== null;
          count = exists ? 1 : 0;
        } else {
          // Check existence based on filters
          const memories = await memoryClient.retrieveMemories({
            domain,
            keywords,
            tags,
            limit: 1,
            min_confidence: 0.0,
          });
          exists = memories.length > 0;
          count = memories.length;
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                exists,
                count,
                message: exists ? "Information exists in memory system" : "Information not found in memory system",
              }, null, 2),
            },
          ],
        };
      }

      case "memory_delete_information": {
        const { memory_id, domain, tags = [], confirmation = false } = args;
        
        if (confirmation && !confirm(`Are you sure you want to delete memory ${memory_id}?`)) {
          throw new Error("Deletion cancelled by user");
        }
        
        await memoryClient.deleteMemory(memory_id);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully deleted information with memory ID: ${memory_id}`,
            },
          ],
        };
      }

      case "memory_semantic_search": {
        const { query, domain, n_results = 5, collection_name = "memories" } = args;
        
        // Convert query to embedding and search ChromaDB
        const results = await chromaClient.query(collection_name, query, n_results);
        
        // Enhance results with memory information
        const enhancedResults = await Promise.all(results.map(async (result) => {
          const memory = await memoryClient.getMemoryById(result.id);
          return {
            ...result,
            memory: memory ? {
              domain: memory.domain,
              content_data: memory.content_data,
              tags: memory.tags,
              confidence: memory.confidence,
              timestamp: memory.timestamp,
              source: memory.source,
            } : null,
          };
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                results: enhancedResults,
                total_results: enhancedResults.length,
              }, null, 2),
            },
          ],
        };
      }

      case "memory_rag_generate": {
        const { prompt, context_memories = [], domain, max_tokens = 1000, temperature = 0.7 } = args;
        
        // Get context from memories if provided
        let context = "";
        if (context_memories.length > 0) {
          const memories = await Promise.all(
            context_memories.map(id => memoryClient.getMemoryById(id))
          );
          const validMemories = memories.filter(m => m !== null);
          
          if (validMemories.length > 0) {
            context = "Context information:\n" + 
              validMemories.map(m => `- ${m.content_data}`).join('\n') + 
              "\n\n";
          }
        }
        
        // Generate response using vLLM with context
        const response = await vllmClient.generate({
          prompt: context + prompt,
          max_tokens,
          temperature,
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Generated response:\n${response.text}`,
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
  console.error("Starting Comprehensive Memory System MCP Server...");
  const transport = new StdioServerTransport();
  console.error("Creating stdio transport...");
  await server.connect(transport);
  console.error("Comprehensive Memory System MCP Server connected and running on stdio");
  console.error("Server ready to accept requests");
}

main().catch(console.error);
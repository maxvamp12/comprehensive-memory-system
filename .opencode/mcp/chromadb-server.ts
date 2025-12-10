#!/usr/bin/env bun
/**\n * ChromaDB MCP Server\n *\n * This MCP server provides RAG (Retrieval Augmented Generation) capabilities\n * by connecting to a ChromaDB instance running on the SARK cluster.\n * \n * Uses v2 API which is the current supported API.\n */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment variables
const CHROMADB_HOST = process.env.CHROMADB_HOST || "192.168.68.69";
const CHROMADB_PORT = process.env.CHROMADB_PORT || "8001";
const CHROMADB_URL = `http://${CHROMADB_HOST}:${CHROMADB_PORT}`;

// Simple embedding service for testing
class EmbeddingService {
  private dimension: number = 3; // Match ChromaDB collection dimension

  async embed(text: string): Promise<number[]> {
    // For now, create a deterministic mock embedding based on text
    // In production, replace this with a real embedding service
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Simple hash-based embedding generation
    const embedding = new Array(this.dimension).fill(0);
    for (let i = 0; i < data.length; i++) {
      embedding[i % this.dimension] = (embedding[i % this.dimension] + data[i]) / 255;
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}

// ChromaDB API client
class ChromaDBClient {
  private baseUrl: string;
  private embeddingService: EmbeddingService;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.embeddingService = new EmbeddingService();
  }

  async listCollections(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
    const data = await response.json();
    
    console.error("ChromaDB API response:", data);
    
    // Handle deprecated API response
    if (data.error && (data.error === "Unimplemented" || data.message.includes("deprecated"))) {
      return []; // Return empty array for deprecated API
    }
    
    // v2 API returns array of collection objects
    return data.map((c: any) => c.name);
  }

  async query(
    collection: string,
    queryText: string,
    nResults: number = 5
  ): Promise<any> {
    // Convert text to embedding using the embedding service
    const queryEmbedding = await this.embeddingService.embed(queryText);
    
    // Get collection ID by name
    const collectionId = await this.getCollectionId(collection);
    
    const response = await fetch(
      `${this.baseUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_embeddings: [queryEmbedding],
          n_results: nResults,
        }),
      }
    );
    return await response.json();
  }

  private async getCollectionId(name: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
    const collections = await response.json();
    
    const collection = collections.find((c: any) => c.name === name);
    if (!collection) {
      throw new Error(`Collection '${name}' not found`);
    }
    
    return collection.id;
  }

  async add(
    collection: string,
    documents: string[],
    ids: string[],
    metadatas?: Record<string, any>[]
  ): Promise<void> {
    // Generate embeddings for each document
    const embeddings = await Promise.all(
      documents.map(doc => this.embeddingService.embed(doc))
    );

    // Get collection ID by name
    const collectionId = await this.getCollectionId(collection);

    await fetch(`${this.baseUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documents,
        ids,
        metadatas,
        embeddings,
      }),
    });
  }

  async createCollection(name: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }
}

const chromaClient = new ChromaDBClient(CHROMADB_URL);

// Create MCP server
const server = new Server(
  {
    name: "chromadb-rag",
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
        name: "chroma_search",
        description:
          "Search for relevant documents in ChromaDB using semantic search",
        inputSchema: {
          type: "object",
          properties: {
            collection: {
              type: "string",
              description: "The name of the ChromaDB collection to search",
            },
            query: {
              type: "string",
              description: "The search query text",
            },
            n_results: {
              type: "number",
              description: "Number of results to return (default: 5)",
              default: 5,
            },
          },
          required: ["collection", "query"],
        },
      },
      {
        name: "chroma_list_collections",
        description: "List all available ChromaDB collections",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "chroma_add_documents",
        description: "Add documents to a ChromaDB collection",
        inputSchema: {
          type: "object",
          properties: {
            collection: {
              type: "string",
              description: "The name of the ChromaDB collection",
            },
            documents: {
              type: "array",
              items: { type: "string" },
              description: "Array of document texts to add",
            },
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of unique IDs for the documents",
            },
            metadatas: {
              type: "array",
              items: { type: "object" },
              description: "Optional array of metadata objects",
            },
          },
          required: ["collection", "documents", "ids"],
        },
      },
      {
        name: "chroma_create_collection",
        description: "Create a new ChromaDB collection",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the collection to create",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "remember_information",
        description: "Remember or store information in a simple, natural way",
        inputSchema: {
          type: "object",
          properties: {
            information: {
              type: "string",
              description: "The information to remember (e.g., 'My cat's name is Cuddles')",
            },
            category: {
              type: "string",
              description: "Category of information (e.g., 'personal', 'work', 'preferences')",
              default: "personal",
            },
          },
          required: ["information"],
        },
      },
    ],
  };
});



// Handle initialize request
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  console.error("Initialize request received:", request);
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "chromadb-rag",
      version: "1.0.0",
    },
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "chroma_search": {
        const { collection, query, n_results = 5 } = request.params
          .arguments as any;
        const results = await chromaClient.query(collection, query, n_results);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "chroma_list_collections": {
        const collections = await chromaClient.listCollections();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(collections, null, 2),
            },
          ],
        };
      }

      case "chroma_add_documents": {
        const { collection, documents, ids, metadatas } = request.params
          .arguments as any;
        await chromaClient.add(collection, documents, ids, metadatas);
        return {
          content: [
            {
              type: "text",
              text: `Successfully added ${documents.length} documents to collection '${collection}'`,
            },
          ],
        };
      }

      case "chroma_create_collection": {
        const { name } = request.params.arguments as any;
        await chromaClient.createCollection(name);
        return {
          content: [
            {
              type: "text",
              text: `Successfully created collection '${name}'`,
            },
          ],
        };
      }

      case "remember_information": {
        const { information, category = "personal" } = request.params.arguments as any;
        
        // Generate a unique ID for this information
        const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add metadata about the memory
        const metadata = {
          category,
          timestamp: new Date().toISOString(),
          type: "memory",
          source: "user_input"
        };
        
        await chromaClient.add("test_collection", [information], [id], [metadata]);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ I've remembered: "${information}"`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
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
  console.error("Starting ChromaDB MCP Server...");
  const transport = new StdioServerTransport();
  console.error("Creating stdio transport...");
  await server.connect(transport);
  console.error("ChromaDB MCP Server connected and running on stdio");
  console.error("Server ready to accept requests");
}

main().catch(console.error);

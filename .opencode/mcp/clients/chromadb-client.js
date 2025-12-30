/**
 * ChromaDB Client
 * 
 * Client for interacting with ChromaDB vector database
 */

export function createClient(chromaDbUrl) {
  const client = {
    chromaDbUrl,
    
    async embed(text) {
      // Simple embedding service - in production, use a real embedding model
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Create deterministic mock embedding
      const embedding = new Array(3).fill(0);
      for (let i = 0; i < data.length; i++) {
        embedding[i % 3] = (embedding[i % 3] + data[i]) / 255;
      }
      
      // Normalize
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / magnitude);
    },
    
    async listCollections() {
      try {
        const response = await fetch(`${this.chromaDbUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
        const data = await response.json();
        
        if (data.error && (data.error === "Unimplemented" || data.message.includes("deprecated"))) {
          return [];
        }
        
        return data.map((c) => c.name);
      } catch (error) {
        console.error("Error listing collections:", error);
        return [];
      }
    },
    
    async query(collection, queryText, nResults = 5) {
      // Convert query to embedding
      const queryEmbedding = await this.embed(queryText);
      
      // Get collection ID
      const collectionId = await this.getCollectionId(collection);
      
      const response = await fetch(
        `${this.chromaDbUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query_embeddings: [queryEmbedding],
            n_results: nResults,
          }),
        }
      );
      
      return response.json();
    },
    
    async add(collection, documents, ids, metadatas = []) {
      // Generate embeddings
      const embeddings = await Promise.all(
        documents.map(doc => this.embed(doc))
      );
      
      const collectionId = await this.getCollectionId(collection);
      
      await fetch(`${this.chromaDbUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${collectionId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents,
          ids,
          metadatas,
          embeddings,
        }),
      });
    },
    
    async createCollection(name) {
      await fetch(`${this.chromaDbUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    
    async getCollectionId(name) {
      const response = await fetch(`${this.chromaDbUrl}/api/v2/tenants/default_tenant/databases/default_database/collections`);
      const collections = await response.json();
      
      const collection = collections.find((c) => c.name === name);
      if (!collection) {
        throw new Error(`Collection '${name}' not found`);
      }
      
      return collection.id;
    }
  };
  
  return client;
}
/**
 * Memory System Client
 * 
 * Client for interacting with the Comprehensive Memory System API
 */

export function createClient(memoryServiceUrl) {
  const client = {
    memoryServiceUrl,
    
    async storeMemory(data) {
      const response = await fetch(`${this.memoryServiceUrl}/api/memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to store memory: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async retrieveMemories(params) {
      const response = await fetch(`${this.memoryServiceUrl}/api/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve memories: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async getMemoryById(memoryId) {
      const response = await fetch(`${this.memoryServiceUrl}/api/memory/${memoryId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get memory: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async deleteMemory(memoryId) {
      const response = await fetch(`${this.memoryServiceUrl}/api/memory/${memoryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.statusText}`);
      }
    },
    
    async listDomains() {
      const response = await fetch(`${this.memoryServiceUrl}/api/domains`);
      
      if (!response.ok) {
        throw new Error(`Failed to list domains: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async getStatistics(domain) {
      const url = domain ? `${this.memoryServiceUrl}/api/statistics?domain=${domain}` : `${this.memoryServiceUrl}/api/statistics`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get statistics: ${response.statusText}`);
      }
      
      return response.json();
    }
  };
  
  return client;
}
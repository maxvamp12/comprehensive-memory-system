/**
 * vLLM Client
 * 
 * Client for interacting with vLLM text generation service
 */

export function createClient(vllmUrl) {
  const client = {
    vllmUrl,
    
    async generate(params) {
      const { prompt, max_tokens = 1000, temperature = 0.7 } = params;
      
      const response = await fetch(`${this.vllmUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4.5-air',
          prompt,
          max_tokens,
          temperature,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate text: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async chat(params) {
      const { messages, max_tokens = 1000, temperature = 0.7 } = params;
      
      const response = await fetch(`${this.vllmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4.5-air',
          messages,
          max_tokens,
          temperature,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate chat response: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async health() {
      const response = await fetch(`${this.vllmUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      
      return response.json();
    }
  };
  
  return client;
}
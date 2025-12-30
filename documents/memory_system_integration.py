import requests
import json
import datetime
from typing import Dict, List, Any, Optional


class MemorySystemClient:
    """Client for integrating with the Memory System"""

    def __init__(self):
        self.base_urls = {
            "memory": "http://192.168.68.71:8080",
            "chroma": "http://192.168.68.69:8001",
            "vllm": "http://192.168.68.69:8000",
        }

    def health_check(self) -> Dict[str, Any]:
        """Check health of all services"""
        health_status = {}

        # Check Memory Service
        try:
            response = requests.get(f"{self.base_urls['memory']}/health")
            health_status["memory"] = response.json()
        except Exception as e:
            health_status["memory"] = {"error": str(e)}

        # Check ChromaDB
        try:
            response = requests.get(f"{self.base_urls['chroma']}/api/v1/heartbeat")
            health_status["chroma"] = response.json()
        except Exception as e:
            health_status["chroma"] = {"error": str(e)}

        # Check vLLM
        try:
            response = requests.get(f"{self.base_urls['vllm']}/health")
            health_status["vllm"] = response.json()
        except Exception as e:
            health_status["vllm"] = {"error": str(e)}

        return health_status

    def store_memory(
        self, domain: str, content: str, metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Store a memory entry"""
        data = {
            "action": "store",
            "domain": domain,
            "content": content,
            "metadata": metadata or {},
        }
        response = requests.post(f"{self.base_urls['memory']}/api/memory", json=data)
        return response.json()

    def retrieve_memories(
        self, domain: str, query: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retrieve memories from a domain"""
        data = {"action": "retrieve", "domain": domain, "query": query}
        response = requests.post(f"{self.base_urls['memory']}/api/memory", json=data)
        return response.json()

    def semantic_search(
        self, query: str, domain: str = "technical", limit: int = 5
    ) -> Dict[str, Any]:
        """Perform semantic search"""
        data = {"query": query, "domain": domain, "limit": limit}
        response = requests.post(f"{self.base_urls['chroma']}/api/v1/query", json=data)
        return response.json()

    def generate_text(
        self, prompt: str, max_tokens: int = 100, temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Generate text using vLLM"""
        data = {"prompt": prompt, "max_tokens": max_tokens, "temperature": temperature}
        response = requests.post(f"{self.base_urls['vllm']}/generate", json=data)
        return response.json()

    def rag_pipeline(
        self, user_input: str, context_domain: str = "general"
    ) -> Dict[str, Any]:
        """End-to-end RAG pipeline"""
        result = {
            "user_input": user_input,
            "timestamp": datetime.datetime.now().isoformat(),
            "steps": [],
        }

        # Step 1: Store user input
        try:
            store_result = self.store_memory(
                domain="user_requests",
                content=user_input,
                metadata={"timestamp": result["timestamp"]},
            )
            result["steps"].append({"step": "store_input", "result": store_result})
        except Exception as e:
            result["steps"].append({"step": "store_input", "error": str(e)})

        # Step 2: Semantic search for relevant context
        try:
            search_result = self.semantic_search(
                query=user_input, domain=context_domain
            )
            result["steps"].append({"step": "semantic_search", "result": search_result})

            # Extract context for generation
            context_items = search_result.get("results", [])
            context_text = " ".join([item.get("content", "") for item in context_items])

        except Exception as e:
            result["steps"].append({"step": "semantic_search", "error": str(e)})
            context_text = ""

        # Step 3: Generate response
        try:
            full_prompt = f"User question: {user_input}\n\nRelevant context: {context_text}\n\nProvide a helpful response:"
            generate_result = self.generate_text(prompt=full_prompt, max_tokens=150)
            result["steps"].append(
                {"step": "generate_response", "result": generate_result}
            )
            result["response"] = generate_result.get("text", "")

        except Exception as e:
            result["steps"].append({"step": "generate_response", "error": str(e)})
            result["response"] = "Error generating response."

        return result


class EnhancedOpencodeAgent:
    """Opencode Agent with integrated Memory System"""

    def __init__(self):
        self.memory_system = MemorySystemClient()
        self.conversation_history = []
        self.session_context = {}

    def process_request(
        self, user_input: str, context_domain: str = "general"
    ) -> Dict[str, Any]:
        """Process user request with memory system integration"""

        # Add to conversation history
        self.conversation_history.append(
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "input": user_input,
                "processing": True,
            }
        )

        # Process through RAG pipeline
        result = self.memory_system.rag_pipeline(user_input, context_domain)

        # Add to conversation history
        self.conversation_history[-1]["processing"] = False
        self.conversation_history[-1]["result"] = result

        return result

    def add_memory(
        self, content: str, domain: str = "general", metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Add a memory to the system"""
        return self.memory_system.store_memory(domain, content, metadata)

    def search_memory(self, query: str, domain: str = "general") -> Dict[str, Any]:
        """Search stored memories"""
        return self.memory_system.semantic_search(query, domain)

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversation_history

    def clear_conversation_history(self):
        """Clear conversation history"""
        self.conversation_history = []


# Example Usage
if __name__ == "__main__":
    # Initialize the enhanced agent
    agent = EnhancedOpencodeAgent()

    # Check system health
    print("=== System Health Check ===")
    health = agent.memory_system.health_check()
    print(json.dumps(health, indent=2))

    # Example 1: Process a user request
    print("\n=== Example 1: Processing User Request ===")
    user_input = "What are the best practices for Python programming?"
    result = agent.process_request(user_input, "technical")
    print(json.dumps(result, indent=2))

    # Example 2: Add a memory
    print("\n=== Example 2: Adding Memory ===")
    memory_result = agent.add_memory(
        "Python list comprehensions are more efficient than map() for simple operations",
        domain="technical",
        metadata={"topic": "python", "priority": "medium"},
    )
    print(json.dumps(memory_result, indent=2))

    # Example 3: Search memory
    print("\n=== Example 3: Searching Memory ===")
    search_result = agent.search_memory(
        "Python programming best practices", "technical"
    )
    print(json.dumps(search_result, indent=2))

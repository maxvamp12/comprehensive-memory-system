#!/usr/bin/env python3
"""
ChromaDB Storage Backend for Multi-Domain Memory System
Uses ChromaDB for enterprise-level vector storage with semantic search capabilities.
"""

import json
import uuid
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    chromadb = None
    Settings = None

try:
    import httpx
except ImportError:
    httpx = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChromaDBStorage:
    """ChromaDB-based storage for multi-domain memory system"""

    def __init__(
        self,
        host: str = None,
        port: int = None,
        collection_prefix: str = "memory_",
    ):
        """
        Initialize ChromaDB connection.

        Args:
            host: ChromaDB server host (default: from env or 192.168.68.69)
            port: ChromaDB server port (default: from env or 8001)
            collection_prefix: Prefix for collection names
        """
        self.host = host or os.environ.get("CHROMADB_HOST", "192.168.68.69")
        self.port = int(port or os.environ.get("CHROMADB_PORT", "8001"))
        self.collection_prefix = collection_prefix
        self.base_url = f"http://{self.host}:{self.port}"

        # Domain-specific collections
        self.domains = [
            "bmad_code",
            "website_info",
            "religious_discussions",
            "electronics_maker",
        ]

        self._client = None
        self._collections = {}
        self._initialize()

    def _initialize(self):
        """Initialize ChromaDB client and collections"""
        try:
            # Always use direct HTTP API for maximum compatibility
            # The chromadb Python client has version compatibility issues
            logger.info(f"Using HTTP API for ChromaDB at {self.base_url}")
            self._client = None

            # Test connection
            import urllib.request
            url = f"{self.base_url}/api/v1/heartbeat"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as response:
                result = response.read().decode()
                logger.info(f"ChromaDB heartbeat: {result}")

            # Ensure collections exist for each domain
            for domain in self.domains:
                self._ensure_collection(domain)

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise

    def _ensure_collection(self, domain: str):
        """Ensure a collection exists for the domain"""
        collection_name = f"{self.collection_prefix}{domain}"

        try:
            # Use HTTP API for maximum compatibility
            self._ensure_collection_http(collection_name, domain)

        except Exception as e:
            logger.error(f"Failed to ensure collection {collection_name}: {e}")
            raise

    def _ensure_collection_http(self, collection_name: str, domain: str):
        """Ensure collection exists via HTTP API"""
        import urllib.request
        import urllib.error

        # Check if collection exists
        try:
            url = f"{self.base_url}/api/v1/collections"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10) as response:
                collections = json.loads(response.read().decode())

            for col in collections:
                if col.get("name") == collection_name:
                    self._collections[domain] = {"id": col["id"], "name": collection_name}
                    return

        except urllib.error.URLError as e:
            logger.warning(f"Failed to list collections: {e}")

        # Create collection if it doesn't exist
        try:
            url = f"{self.base_url}/api/v1/collections"
            data = json.dumps({
                "name": collection_name,
                "metadata": {"domain": domain, "description": f"Memory system for {domain}"}
            }).encode()
            req = urllib.request.Request(url, data=data, method="POST")
            req.add_header("Content-Type", "application/json")

            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode())
                self._collections[domain] = {"id": result.get("id"), "name": collection_name}
                logger.info(f"Created collection: {collection_name}")

        except urllib.error.URLError as e:
            logger.error(f"Failed to create collection {collection_name}: {e}")

    def _generate_embedding_placeholder(self, text: str) -> List[float]:
        """
        Generate a simple hash-based embedding placeholder.
        In production, this should call vLLM or another embedding model.
        """
        # Create a deterministic 384-dimensional embedding from text hash
        # SHA-256 gives 64 hex chars = 32 bytes, we need to extend it
        import hashlib
        embedding = []

        # Generate multiple hashes to get enough dimensions
        for seed in range(12):  # 12 * 32 = 384 dimensions
            hash_input = f"{text}:{seed}"
            text_hash = hashlib.sha256(hash_input.encode()).hexdigest()
            for i in range(0, 64, 2):
                val = int(text_hash[i:i+2], 16) / 255.0 - 0.5
                embedding.append(val)

        return embedding[:384]

    def _text_for_embedding(self, content_data: Dict, metadata: Dict, context: Dict) -> str:
        """Generate text for embedding from memory components"""
        parts = []

        # Add content data text
        for key, value in content_data.items():
            if isinstance(value, str):
                parts.append(value)
            elif isinstance(value, (list, dict)):
                parts.append(json.dumps(value))

        # Add metadata text
        for key, value in metadata.items():
            if isinstance(value, str):
                parts.append(value)

        # Add context text
        for key, value in context.items():
            if isinstance(value, str):
                parts.append(value)

        return " ".join(parts)

    def store_memory(
        self,
        domain: str,
        memory_id: str,
        content_data: Dict[str, Any],
        metadata: Dict[str, Any],
        tags: List[str],
        timestamp: str,
        source: str,
        confidence: float,
        context: Dict[str, Any],
        subdomain: Optional[str] = None,
        content_type: str = "conversation",
    ) -> str:
        """Store a memory entry in ChromaDB"""
        if domain not in self.domains:
            raise ValueError(f"Invalid domain: {domain}")

        # Generate embedding text
        text = self._text_for_embedding(content_data, metadata, context)
        embedding = self._generate_embedding_placeholder(text)

        # Prepare document and metadata for ChromaDB
        document = json.dumps({
            "content_data": content_data,
            "context": context,
        })

        chroma_metadata = {
            "domain": domain,
            "subdomain": subdomain or "",
            "content_type": content_type,
            "tags": json.dumps(tags),
            "timestamp": timestamp,
            "source": source,
            "confidence": confidence,
            "metadata_json": json.dumps(metadata),
        }

        try:
            # Always use HTTP API for compatibility
            self._store_memory_http(domain, memory_id, embedding, document, chroma_metadata)

            logger.info(f"Stored memory {memory_id} in {domain}")
            return memory_id

        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            raise

    def _store_memory_http(
        self,
        domain: str,
        memory_id: str,
        embedding: List[float],
        document: str,
        metadata: Dict[str, Any],
    ):
        """Store memory via HTTP API"""
        import urllib.request

        collection_info = self._collections.get(domain, {})
        collection_id = collection_info.get("id")

        if not collection_id:
            raise ValueError(f"Collection not found for domain: {domain}")

        url = f"{self.base_url}/api/v1/collections/{collection_id}/add"
        data = json.dumps({
            "ids": [memory_id],
            "embeddings": [embedding],
            "documents": [document],
            "metadatas": [metadata],
        }).encode()

        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=30) as response:
            response.read()

    def search_memories(
        self,
        query: str = None,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        limit: int = 100,
        min_confidence: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """Search memories with optional semantic search"""
        results = []

        # Determine which domains to search
        domains_to_search = [domain] if domain else self.domains

        for d in domains_to_search:
            try:
                domain_results = self._search_domain(
                    domain=d,
                    query=query,
                    content_type=content_type,
                    tags=tags,
                    source=source,
                    limit=limit,
                    min_confidence=min_confidence,
                )
                results.extend(domain_results)
            except Exception as e:
                logger.warning(f"Failed to search domain {d}: {e}")

        # Sort by relevance/timestamp and limit
        results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return results[:limit]

    def _search_domain(
        self,
        domain: str,
        query: str = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        limit: int = 100,
        min_confidence: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """Search a specific domain"""
        results = []

        # Build where filter
        where_filter = {}
        if content_type:
            where_filter["content_type"] = content_type
        if source:
            where_filter["source"] = source
        if min_confidence > 0:
            where_filter["confidence"] = {"$gte": min_confidence}

        try:
            # Always use HTTP API for compatibility
            results = self._search_domain_http(
                domain, query, where_filter, limit
            )

        except Exception as e:
            logger.error(f"Search failed for domain {domain}: {e}")

        # Filter by tags if specified
        if tags:
            results = [
                r for r in results
                if any(tag in r.get("tags", []) for tag in tags)
            ]

        return results

    def _search_domain_http(
        self,
        domain: str,
        query: str = None,
        where_filter: Dict = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Search domain via HTTP API"""
        import urllib.request

        collection_info = self._collections.get(domain, {})
        collection_id = collection_info.get("id")

        if not collection_id:
            return []

        if query:
            # Query with embedding
            url = f"{self.base_url}/api/v1/collections/{collection_id}/query"
            query_embedding = self._generate_embedding_placeholder(query)
            data = json.dumps({
                "query_embeddings": [query_embedding],
                "n_results": limit,
                "where": where_filter if where_filter else None,
            }).encode()
        else:
            # Get all
            url = f"{self.base_url}/api/v1/collections/{collection_id}/get"
            data = json.dumps({
                "limit": limit,
                "where": where_filter if where_filter else None,
            }).encode()

        try:
            req = urllib.request.Request(url, data=data, method="POST")
            req.add_header("Content-Type", "application/json")

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                return self._parse_chroma_results(result, domain)

        except Exception as e:
            logger.error(f"HTTP search failed: {e}")
            return []

    def _parse_chroma_results(
        self,
        results: Dict[str, Any],
        domain: str,
    ) -> List[Dict[str, Any]]:
        """Parse ChromaDB results into memory entries"""
        memories = []

        # Handle both query and get result formats
        ids = results.get("ids", [[]])[0] if isinstance(results.get("ids", []), list) and results.get("ids") and isinstance(results["ids"][0], list) else results.get("ids", [])
        documents = results.get("documents", [[]])[0] if isinstance(results.get("documents", []), list) and results.get("documents") and isinstance(results["documents"][0], list) else results.get("documents", [])
        metadatas = results.get("metadatas", [[]])[0] if isinstance(results.get("metadatas", []), list) and results.get("metadatas") and isinstance(results["metadatas"][0], list) else results.get("metadatas", [])
        distances = results.get("distances", [[]])[0] if results.get("distances") else None

        for i, memory_id in enumerate(ids):
            try:
                document = documents[i] if i < len(documents) else "{}"
                metadata = metadatas[i] if i < len(metadatas) else {}

                # Parse document JSON
                doc_data = json.loads(document) if isinstance(document, str) else document

                # Parse metadata JSON fields
                tags = json.loads(metadata.get("tags", "[]"))
                stored_metadata = json.loads(metadata.get("metadata_json", "{}"))

                memory = {
                    "id": memory_id,
                    "domain": metadata.get("domain", domain),
                    "subdomain": metadata.get("subdomain", ""),
                    "content_type": metadata.get("content_type", "conversation"),
                    "content_data": doc_data.get("content_data", {}),
                    "metadata": stored_metadata,
                    "tags": tags,
                    "timestamp": metadata.get("timestamp", ""),
                    "source": metadata.get("source", ""),
                    "confidence": float(metadata.get("confidence", 1.0)),
                    "context": doc_data.get("context", {}),
                }

                # Add distance/similarity score if available
                if distances and i < len(distances):
                    memory["similarity_score"] = 1.0 / (1.0 + distances[i])

                memories.append(memory)

            except Exception as e:
                logger.warning(f"Failed to parse memory {memory_id}: {e}")

        return memories

    def get_memory(self, domain: str, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific memory by ID"""
        try:
            # Always use HTTP API for compatibility
            return self._get_memory_http(domain, memory_id)
        except Exception as e:
            logger.error(f"Failed to get memory {memory_id}: {e}")
            return None

    def _get_memory_http(self, domain: str, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get memory via HTTP API"""
        import urllib.request

        collection_info = self._collections.get(domain, {})
        collection_id = collection_info.get("id")

        if not collection_id:
            return None

        url = f"{self.base_url}/api/v1/collections/{collection_id}/get"
        data = json.dumps({"ids": [memory_id]}).encode()

        try:
            req = urllib.request.Request(url, data=data, method="POST")
            req.add_header("Content-Type", "application/json")

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                memories = self._parse_chroma_results(result, domain)
                return memories[0] if memories else None

        except Exception as e:
            logger.error(f"HTTP get failed: {e}")
            return None

    def delete_memory(self, domain: str, memory_id: str) -> bool:
        """Delete a memory entry"""
        try:
            # Always use HTTP API for compatibility
            return self._delete_memory_http(domain, memory_id)
        except Exception as e:
            logger.error(f"Failed to delete memory {memory_id}: {e}")
            return False

    def _delete_memory_http(self, domain: str, memory_id: str) -> bool:
        """Delete memory via HTTP API"""
        import urllib.request

        collection_info = self._collections.get(domain, {})
        collection_id = collection_info.get("id")

        if not collection_id:
            return False

        url = f"{self.base_url}/api/v1/collections/{collection_id}/delete"
        data = json.dumps({"ids": [memory_id]}).encode()

        try:
            req = urllib.request.Request(url, data=data, method="POST")
            req.add_header("Content-Type", "application/json")

            with urllib.request.urlopen(req, timeout=30) as response:
                response.read()
                return True

        except Exception as e:
            logger.error(f"HTTP delete failed: {e}")
            return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get memory system statistics"""
        stats = {
            "total_memories": 0,
            "domain_distribution": {},
            "content_type_distribution": {},
            "chromadb_host": self.host,
            "chromadb_port": self.port,
        }

        for domain in self.domains:
            try:
                # Always use HTTP API for compatibility
                count = self._get_count_http(domain)
                stats["domain_distribution"][domain] = count
                stats["total_memories"] += count

            except Exception as e:
                logger.warning(f"Failed to get count for {domain}: {e}")
                stats["domain_distribution"][domain] = 0

        return stats

    def _get_count_http(self, domain: str) -> int:
        """Get collection count via HTTP API"""
        import urllib.request

        collection_info = self._collections.get(domain, {})
        collection_id = collection_info.get("id")

        if not collection_id:
            return 0

        url = f"{self.base_url}/api/v1/collections/{collection_id}/count"

        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10) as response:
                return int(response.read().decode())
        except Exception as e:
            logger.warning(f"Failed to get count: {e}")
            return 0


# Singleton instance
_storage_instance = None


def get_chromadb_storage() -> ChromaDBStorage:
    """Get or create ChromaDB storage instance"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = ChromaDBStorage()
    return _storage_instance

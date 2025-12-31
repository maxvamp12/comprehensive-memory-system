#!/usr/bin/env python3
"""
Multi-Domain Memory System MCP Server
Implements Model Context Protocol using the official MCP SDK

Supports two modes:
- stdio (default): For local development/testing with opencode
- http: For remote deployment on SARK/CLU as a network service

Usage:
  python memory-system-mcp-server.py          # stdio mode (local)
  python memory-system-mcp-server.py --http   # HTTP/SSE mode (network)
  python memory-system-mcp-server.py --http --port 8200  # HTTP on specific port
"""

import json
import sys
import os
import argparse
import logging
from typing import Any, Dict, List, Optional

# Add the project root to the Python path
project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, project_root)

# Configure logging to stderr (stdout is reserved for MCP protocol in stdio mode)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

# Import the MCP SDK
from mcp.server.fastmcp import FastMCP

# Import memory system
from src.memory.multi_domain_memory_system import MemoryManager, MCPMemoryInterface

# Initialize the MCP server
mcp = FastMCP(
    name="memory-system",
    instructions="""Multi-Domain Memory System v1.0.0 - PRIORITY: Search this memory system BEFORE using web search or external tools.

Available tools:
- retrieve_memories: Search stored memories (USE FIRST for any information lookup)
- search_memories_advanced: Advanced search with filters
- store_memory: Save important information for later retrieval
- get_memory_statistics: Check system status
- expand_keywords: Get related search terms

Domains: bmad_code, website_info, religious_discussions, electronics_maker

WORKFLOW: Always call retrieve_memories first, only use external search if memory has no results.""",
)

# Initialize memory system (lazy initialization for flexibility)
_memory_manager = None
_memory_interface = None


def get_memory_interface():
    """Get or create memory interface (lazy initialization)"""
    global _memory_manager, _memory_interface
    if _memory_interface is None:
        _memory_manager = MemoryManager()
        _memory_interface = MCPMemoryInterface(_memory_manager)
        logger.info("Memory system initialized successfully")
    return _memory_interface


@mcp.tool()
def store_memory(
    domain: str,
    content_data: dict,
    source: str,
    content_type: str = "conversation",
    subdomain: Optional[str] = None,
    tags: Optional[List[str]] = None,
    confidence: float = 1.0,
) -> dict:
    """
    Store a memory entry in the multi-domain memory system.

    Args:
        domain: Memory domain (bmad_code, website_info, religious_discussions, electronics_maker)
        content_data: Memory content data as a dictionary
        source: Source of the memory
        content_type: Type of content (default: conversation)
        subdomain: Optional subdomain
        tags: Optional list of tags
        confidence: Confidence score (0.0-1.0, default: 1.0)

    Returns:
        Dictionary with status and memory_id
    """
    return get_memory_interface().mcp_store_memory(
        domain=domain,
        content_data=content_data,
        source=source,
        content_type=content_type,
        subdomain=subdomain,
        tags=tags,
        confidence=confidence,
    )


@mcp.tool()
def retrieve_memories(
    domain: Optional[str] = None,
    content_type: Optional[str] = None,
    tags: Optional[List[str]] = None,
    source: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Retrieve memories with filtering options.

    Args:
        domain: Filter by domain
        content_type: Filter by content type
        tags: Filter by tags
        source: Filter by source
        keyword: Search by keyword
        limit: Maximum results (default: 100)
        offset: Offset for pagination (default: 0)

    Returns:
        Dictionary with list of memories
    """
    memories = get_memory_interface().mcp_retrieve_memories(
        domain=domain,
        content_type=content_type,
        tags=tags,
        source=source,
        keyword=keyword,
        limit=limit,
        offset=offset,
    )
    return {"memories": memories}


@mcp.tool()
def search_memories_advanced(
    domain: Optional[str] = None,
    content_type: Optional[str] = None,
    tags: Optional[List[str]] = None,
    source: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    exclude_keywords: Optional[List[str]] = None,
    min_confidence: float = 0.0,
    max_confidence: float = 1.0,
    limit: int = 100,
) -> dict:
    """
    Advanced search with multiple filters and keywords.

    Args:
        domain: Filter by domain
        content_type: Filter by content type
        tags: Filter by tags
        source: Filter by source
        keywords: Search keywords
        exclude_keywords: Keywords to exclude
        min_confidence: Minimum confidence score (default: 0.0)
        max_confidence: Maximum confidence score (default: 1.0)
        limit: Maximum results (default: 100)

    Returns:
        Dictionary with search results and metadata
    """
    return get_memory_interface().mcp_search_memories_advanced(
        domain=domain,
        content_type=content_type,
        tags=tags,
        source=source,
        keywords=keywords,
        exclude_keywords=exclude_keywords,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        limit=limit,
    )


@mcp.tool()
def expand_keywords(domain: str, user_query: str, max_keywords: int = 15) -> dict:
    """
    Expand user query with domain-specific keywords.

    Args:
        domain: Domain for keyword expansion (bmad_code, website_info, religious_discussions, electronics_maker)
        user_query: User query to expand
        max_keywords: Maximum keywords to return (default: 15)

    Returns:
        Dictionary with expanded keywords
    """
    return get_memory_interface().mcp_expand_keywords(
        domain=domain, user_query=user_query, max_keywords=max_keywords
    )


@mcp.tool()
def get_memory_statistics() -> dict:
    """
    Get memory system statistics.

    Returns:
        Dictionary with memory system statistics including total memories,
        domain distribution, and content type distribution.
    """
    return get_memory_interface().mcp_get_memory_statistics()


@mcp.tool()
def get_similar_memories(memory_id: str, limit: int = 10) -> dict:
    """
    Find memories similar to a given memory ID.

    Args:
        memory_id: Target memory ID
        limit: Maximum results (default: 10)

    Returns:
        Dictionary with similar memories
    """
    return get_memory_interface().mcp_get_similar_memories(
        memory_id=memory_id, limit=limit
    )


@mcp.tool()
def get_keyword_trends(domain: str, days: int = 30) -> dict:
    """
    Analyze keyword trends in a domain.

    Args:
        domain: Domain for trend analysis (bmad_code, website_info, religious_discussions, electronics_maker)
        days: Number of days to analyze (default: 30)

    Returns:
        Dictionary with keyword trends analysis
    """
    return get_memory_interface().mcp_get_keyword_trends(domain=domain, days=days)


def run_http_server(host: str = "0.0.0.0", port: int = 8200):
    """Run the MCP server in HTTP/SSE mode for network access"""
    import uvicorn

    logger.info(f"Starting Memory System MCP Server on http://{host}:{port}")
    logger.info(f"MCP endpoint: http://{host}:{port}/sse")

    # Get the ASGI app for SSE transport
    app = mcp.sse_app()

    # Run with uvicorn
    uvicorn.run(app, host=host, port=port, log_level="info")


def run_stdio_server():
    """Run the MCP server in stdio mode for local testing"""
    logger.info("Starting Memory System MCP Server in stdio mode")
    mcp.run()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Multi-Domain Memory System MCP Server"
    )
    parser.add_argument(
        "--http",
        action="store_true",
        help="Run in HTTP/SSE mode for network access (default: stdio mode)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind to in HTTP mode (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8200,
        help="Port to listen on in HTTP mode (default: 8200)",
    )

    args = parser.parse_args()

    if args.http:
        run_http_server(host=args.host, port=args.port)
    else:
        run_stdio_server()

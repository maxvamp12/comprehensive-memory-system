# MCP Memory System Server
# Runs the FastMCP-based memory server in HTTP/SSE mode for network access
# Uses ChromaDB on SARK for enterprise-level vector storage
# Build from /opt/mcp-memory-system on CLU

FROM python:3.12-slim

LABEL maintainer="maxvamp"
LABEL description="Multi-Domain Memory System MCP Server with ChromaDB"
LABEL version="2.0.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the memory system source (from local CLU directory structure)
COPY src/memory/ /app/src/memory/

# Copy the MCP server
COPY memory-system-mcp-server.py /app/

# Create data directory for SQLite fallback persistence
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# ChromaDB configuration - SARK hosts the vector database
ENV CHROMADB_HOST=192.168.68.69
ENV CHROMADB_PORT=8001

# SQLite fallback path (used when ChromaDB is unavailable)
ENV MCP_MEMORY_DB_PATH=/app/data/memory_system.db

# Expose the MCP SSE port
EXPOSE 8200

# Health check - check if server responds (SSE endpoint returns event stream)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8200/ || exit 1

# Run the MCP server in HTTP/SSE mode
CMD ["python", "memory-system-mcp-server.py", "--http", "--host", "0.0.0.0", "--port", "8200"]

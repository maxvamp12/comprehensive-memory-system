#!/bin/bash
# =============================================================================
# MCP Memory System Deployment Script for CLU
# Run this script on CLU to deploy the MCP memory server
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Configuration
DEPLOY_DIR="/opt/mcp-memory-system"
DATA_DIR="$DEPLOY_DIR/data"
LOGS_DIR="$DEPLOY_DIR/logs"
CONTAINER_NAME="mcp-memory-system"
MCP_PORT=8200

echo "=============================================="
echo "  MCP Memory System Deployment - CLU"
echo "=============================================="
echo ""

# Check if running as appropriate user
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Will create directories with proper ownership."
fi

# Step 1: Create directories
print_info "Creating deployment directories..."
sudo mkdir -p "$DATA_DIR" "$LOGS_DIR"
sudo chown -R maxvamp:maxvamp "$DEPLOY_DIR"
print_status "Directories created at $DEPLOY_DIR"

# Step 2: Copy deployment files
print_info "Copying deployment files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR"/* "$DEPLOY_DIR/"
print_status "Deployment files copied"

# Step 3: Build Docker image
print_info "Building Docker image..."
cd "$DEPLOY_DIR"
docker build -t mcp-memory-system:latest -f Dockerfile ../..
print_status "Docker image built"

# Step 4: Stop existing container if running
if docker ps -q --filter name=$CONTAINER_NAME | grep -q .; then
    print_info "Stopping existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    print_status "Existing container removed"
fi

# Step 5: Start new container
print_info "Starting MCP memory system container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $MCP_PORT:8200 \
    -v "$DATA_DIR:/app/data" \
    -v "$LOGS_DIR:/app/logs" \
    -e PYTHONUNBUFFERED=1 \
    -e MCP_MEMORY_DB_PATH=/app/data/memory_system.db \
    mcp-memory-system:latest

print_status "Container started"

# Step 6: Wait for health check
print_info "Waiting for service to be healthy..."
for i in {1..30}; do
    if curl -s http://localhost:$MCP_PORT/sse > /dev/null 2>&1; then
        print_status "MCP Memory System is healthy!"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo "Access points:"
echo "  MCP SSE Endpoint: http://192.168.68.71:$MCP_PORT/sse"
echo "  Data Directory:   $DATA_DIR"
echo "  Logs Directory:   $LOGS_DIR"
echo ""
echo "Container management:"
echo "  Status:  docker ps --filter name=$CONTAINER_NAME"
echo "  Logs:    docker logs -f $CONTAINER_NAME"
echo "  Stop:    docker stop $CONTAINER_NAME"
echo "  Start:   docker start $CONTAINER_NAME"
echo ""
echo "OpenCode configuration (add to opencode.json):"
echo '  "memory-system": {'
echo '    "type": "remote",'
echo '    "url": "http://192.168.68.71:'$MCP_PORT'/sse",'
echo '    "enabled": true'
echo '  }'
echo ""

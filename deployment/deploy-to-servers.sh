#!/bin/bash
# =============================================================================
# Deploy MCP Memory System to Production Servers
# Run this from FLYNN to deploy files to SARK and CLU
# =============================================================================

set -e

# Colors
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
SARK_IP="192.168.68.69"
CLU_IP="192.168.68.71"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=============================================="
echo "  Deploy MCP Memory System to Production"
echo "=============================================="
echo ""
print_info "Project directory: $PROJECT_DIR"
echo ""

# ===== STEP 1: Deploy to SARK =====
echo "=== Deploying to SARK ($SARK_IP) ==="

# Deploy backup script
print_info "Copying backup-clu.sh to SARK..."
scp "$PROJECT_DIR/Backup-system/scripts/backup-clu.sh" maxvamp@$SARK_IP:~/borg-docker/
print_status "backup-clu.sh deployed"

# Deploy startup script
print_info "Copying startup-cluster-vllm11-128k.sh to SARK..."
scp "$PROJECT_DIR/scripts/startup-cluster-vllm11-128k.sh" maxvamp@$SARK_IP:~/
ssh maxvamp@$SARK_IP "chmod +x ~/startup-cluster-vllm11-128k.sh"
print_status "startup-cluster-vllm11-128k.sh deployed"

# Deploy quiesce script
print_info "Copying quiesce-cluster.sh to SARK..."
scp "$PROJECT_DIR/scripts/quiesce-cluster.sh" maxvamp@$SARK_IP:~/
ssh maxvamp@$SARK_IP "chmod +x ~/quiesce-cluster.sh"
print_status "quiesce-cluster.sh deployed"

echo ""

# ===== STEP 2: Deploy to CLU =====
echo "=== Deploying to CLU ($CLU_IP) ==="

# Create deployment directory on CLU
print_info "Creating deployment directory on CLU..."
ssh maxvamp@$CLU_IP "sudo mkdir -p /opt/mcp-memory-system/{data,logs} && sudo chown -R maxvamp:maxvamp /opt/mcp-memory-system"
print_status "Directory created"

# Copy Dockerfile and requirements
print_info "Copying Docker files to CLU..."
scp "$PROJECT_DIR/deployment/clu/Dockerfile" maxvamp@$CLU_IP:/opt/mcp-memory-system/
scp "$PROJECT_DIR/deployment/clu/requirements.txt" maxvamp@$CLU_IP:/opt/mcp-memory-system/
print_status "Docker files copied"

# Copy Python source files
print_info "Copying MCP server source to CLU..."
ssh maxvamp@$CLU_IP "mkdir -p /opt/mcp-memory-system/src/memory"
scp "$PROJECT_DIR/.opencode/mcp/memory-system-mcp-server.py" maxvamp@$CLU_IP:/opt/mcp-memory-system/
scp "$PROJECT_DIR/src/memory/__init__.py" maxvamp@$CLU_IP:/opt/mcp-memory-system/src/memory/
scp "$PROJECT_DIR/src/memory/multi_domain_memory_system.py" maxvamp@$CLU_IP:/opt/mcp-memory-system/src/memory/
print_status "Source files copied"

# Build and start container on CLU
print_info "Building Docker image on CLU..."
ssh maxvamp@$CLU_IP "cd /opt/mcp-memory-system && docker build -t mcp-memory-system:latest -f Dockerfile ."
print_status "Docker image built"

# Stop existing container if running
print_info "Stopping existing container if running..."
ssh maxvamp@$CLU_IP "docker stop mcp-memory-system 2>/dev/null || true"
ssh maxvamp@$CLU_IP "docker rm mcp-memory-system 2>/dev/null || true"

# Start new container
print_info "Starting MCP Memory System container..."
ssh maxvamp@$CLU_IP "docker run -d \
    --name mcp-memory-system \
    --restart unless-stopped \
    -p 8200:8200 \
    -v /opt/mcp-memory-system/data:/app/data \
    -v /opt/mcp-memory-system/logs:/app/logs \
    -e PYTHONUNBUFFERED=1 \
    -e MCP_MEMORY_DB_PATH=/app/data/memory_system.db \
    mcp-memory-system:latest"
print_status "Container started"

# Wait for health
print_info "Waiting for service to be healthy..."
for i in {1..15}; do
    if ssh maxvamp@$CLU_IP "curl -s http://localhost:8200/sse > /dev/null 2>&1"; then
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
echo "Services deployed:"
echo "  SARK ($SARK_IP):"
echo "    - ~/borg-docker/backup-clu.sh"
echo "    - ~/startup-cluster-vllm11-128k.sh"
echo "    - ~/quiesce-cluster.sh"
echo ""
echo "  CLU ($CLU_IP):"
echo "    - MCP Memory System: http://$CLU_IP:8200/sse"
echo "    - Data: /opt/mcp-memory-system/data"
echo "    - Logs: /opt/mcp-memory-system/logs"
echo ""
echo "To verify:"
echo "  ssh maxvamp@$CLU_IP 'docker ps --filter name=mcp-memory-system'"
echo "  curl http://$CLU_IP:8200/sse"
echo ""

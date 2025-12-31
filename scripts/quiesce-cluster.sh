#!/bin/bash
# =============================================================================
# GLM-4.5 Cluster Quiesce Script for OS Updates
# SARK (spark-8b86) - 192.168.68.69 - Swarm Leader
# CLU  (spark-f4cd) - 192.168.68.71 - Swarm Worker
# =============================================================================

set -e

SARK_IP="192.168.68.69"
CLU_IP="192.168.68.71"

echo "=============================================="
echo "  GLM-4.5 Cluster Quiesce for OS Updates"
echo "=============================================="
echo ""
echo "This script will safely stop all services on both nodes."
echo "Run this on SARK (the swarm leader)."
echo ""

# Confirm
read -p "Continue with quiesce? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "=== Step 1: Stop vLLM GLM-4.5-Air cluster ==="
echo "Stopping vLLM serve process inside vllm-head..."
docker exec vllm-head pkill -f "vllm serve" 2>/dev/null || echo "  (vllm serve not running or already stopped)"
sleep 3

echo "Stopping vllm-head container on SARK..."
docker stop vllm-head 2>/dev/null || echo "  (vllm-head not running)"

echo "Stopping vllm-worker container on CLU..."
ssh $CLU_IP "docker stop vllm-worker 2>/dev/null" || echo "  (vllm-worker not running)"

echo ""
echo "=== Step 1.5: Stop Memory Services on CLU ==="
echo "Stopping MCP Memory System..."
ssh $CLU_IP "docker stop mcp-memory-system 2>/dev/null" || echo "  (MCP Memory System not running)"

echo "Stopping Legacy Memory Service..."
ssh $CLU_IP "docker stop memory-system 2>/dev/null" || echo "  (Legacy Memory Service not running)"

echo "Stopping Redis Caching..."
ssh $CLU_IP "docker stop redis-caching 2>/dev/null" || echo "  (Redis Caching not running)"

echo ""
echo "=== Step 2: Stop application containers on SARK ==="
# Stop containers in dependency order (dependent services first)
for container in open-webui anythingllm chromadb ollama; do
    echo "Stopping $container..."
    docker stop $container 2>/dev/null || echo "  ($container not running)"
done

echo ""
echo "=== Step 3: Stop backup services ==="
echo "Stopping borg-backup-server..."

echo "Stopping backup-monitoring service..."
pkill -f "backup-monitoring.py" 2>/dev/null || echo "  (backup-monitoring not running)"
docker stop borg-backup-server 2>/dev/null || echo "  (borg-backup-server not running)"

echo ""
echo "=== Step 4: Drain Swarm nodes ==="
echo "Draining CLU from swarm..."
docker node update --availability drain spark-f4cd 2>/dev/null || echo "  (Could not drain CLU)"
echo "Draining SARK from swarm..."
docker node update --availability drain spark-8b86 2>/dev/null || echo "  (Could not drain SARK)"

echo ""
echo "=== Step 5: Verify all containers stopped ==="
echo ""
echo "SARK containers:"
docker ps --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  None running"
echo ""
echo "CLU containers:"
ssh $CLU_IP "docker ps --format '  {{.Names}}: {{.Status}}'" 2>/dev/null || echo "  None running"

echo ""
echo "=== Step 6: Sync filesystems ==="
echo "Syncing SARK filesystem..."
sync
echo "Syncing CLU filesystem..."
ssh $CLU_IP "sync"

echo ""
echo "=============================================="
echo "  QUIESCE COMPLETE"
echo "=============================================="
echo ""
echo "Both nodes are now safe for OS updates and reboot."
echo ""
echo "After reboot, run: ~/startup-cluster-vllm11-128k.sh"
echo ""
echo "Manual reboot commands:"
echo "  CLU first:  ssh $CLU_IP 'sudo reboot'"
echo "  SARK:       sudo reboot"
echo ""

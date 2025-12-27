#!/bin/bash
# =============================================================================
# GLM-4.5-Air vLLM 0.11 Cluster Startup - 128k Context with fp8 KV Cache
# SARK (spark-8b86) - 192.168.101.10 - Head node
# CLU  (spark-f4cd) - 192.168.101.11 - Worker node
# =============================================================================
# STABLE CONFIGURATION - Model max_position_embeddings = 131072 (128k)
# DO NOT EXCEED 128k - architectural limit, will cause NaN or CUDA errors
# =============================================================================

set -e

# Parse command line arguments
RECREATE_CONTAINERS=false
for arg in "$@"; do
    case $arg in
        --recreate)
            RECREATE_CONTAINERS=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--recreate]"
            exit 1
            ;;
    esac
done

SARK_IP="192.168.101.10"
CLU_IP="192.168.101.11"

echo "=============================================="
echo "  GLM-4.5-Air vLLM 0.11 - 128k Context"
echo "=============================================="
echo ""

# Check if CLU is reachable
echo "=== Step 0: Verify CLU is online ==="
if ! ping -c 1 -W 3 $CLU_IP > /dev/null 2>&1; then
    echo "ERROR: CLU ($CLU_IP) is not reachable. Please ensure CLU is booted first."
    exit 1
fi
echo "CLU is online."

# Check if Docker is running on CLU
echo "Checking Docker on CLU..."
if ! ssh $CLU_IP "docker info > /dev/null 2>&1"; then
    echo "ERROR: Docker is not running on CLU."
    echo "Please SSH to CLU and run:"
    echo "  sudo systemctl start docker"
    echo ""
    echo "If Docker fails to start due to swarm issues, run:"
    echo "  sudo rm -rf /var/lib/docker/swarm"
    echo "  sudo systemctl start docker"
    exit 1
fi
echo "Docker is running on CLU."

echo ""
echo "=== Step 1: Create log directory ==="
mkdir -p /home/maxvamp/vllm-logs
echo "Log directory created at /home/maxvamp/vllm-logs"

echo ""
echo "=== Step 1.5: Start dependency services ==="
echo "Starting ChromaDB on SARK..."
docker start chromadb 2>/dev/null && echo "  ChromaDB started" || echo "  ChromaDB already running or not found"

echo "Starting Borg Backup Server on SARK..."

echo "Starting backup monitoring service..."
if ! pgrep -f "backup-monitoring.py" > /dev/null; then
    echo "  Starting backup monitoring service..."
    nohup python3 /home/maxvamp/backup-monitoring.py > /home/maxvamp/backup-monitoring.log 2>&1 &
    echo "  Backup monitoring service started (PID: $!)"
else
    echo "  Backup monitoring service already running"
fi

docker start borg-backup-server 2>/dev/null && echo "  Borg Backup Server started" || echo "  Borg Backup Server already running or not found"
echo ""

echo "Starting Redis Caching Service on CLU..."
ssh $CLU_IP "docker start redis-caching 2>/dev/null" && echo "  Redis Caching Service started" || echo "  Redis Caching Service already running or not found"

echo "Starting Memory System on CLU..."
ssh $CLU_IP "docker start memory-system 2>/dev/null" && echo "  Memory System started" || echo "  Memory System already running or not found"

echo ""
echo "=== Step 2: Start vLLM head on SARK ==="
# Check if we need to recreate containers
if [ "$RECREATE_CONTAINERS" = true ]; then
    echo "  --recreate flag detected, removing existing vllm-head container..."
    docker rm -f vllm-head 2>/dev/null || true
fi

docker start vllm-head 2>/dev/null || {
    echo "  vllm-head container doesn't exist, creating..."
    docker run -d \
        --name vllm-head \
        --gpus all \
        --network host \
        --privileged \
        --shm-size=64g \
        --restart unless-stopped \
        -v /home/maxvamp/GLM-4.5-Air-AWQ:/model:ro \
        -v /home/maxvamp/.cache/huggingface:/root/.cache/huggingface \
        -v /home/maxvamp/vllm-logs:/var/log/vllm \
        -e NCCL_SOCKET_IFNAME=enp1s0f0np0 \
        -e NCCL_IB_DISABLE=0 \
        -e GLOO_SOCKET_IFNAME=enp1s0f0np0 \
        -e VLLM_HOST_IP=$SARK_IP \
        nvcr.io/nvidia/vllm:25.11-py3 \
        sleep infinity
}

echo "Waiting for Ray head to initialize..."
sleep 5

echo ""
echo "=== Step 3: Start Ray head ==="
docker exec -d vllm-head ray start \
    --head \
    --port=6379 \
    --node-ip-address=$SARK_IP \
    --num-gpus=1 \
    --block

echo "Waiting for Ray head to start..."
sleep 10

echo ""
echo "=== Step 4: Start vLLM worker on CLU ==="
# Check if we need to recreate containers on CLU
if [ "$RECREATE_CONTAINERS" = true ]; then
    echo "  --recreate flag detected, removing existing vllm-worker container..."
    ssh $CLU_IP "docker rm -f vllm-worker 2>/dev/null || true"
fi

ssh $CLU_IP "docker start vllm-worker 2>/dev/null" || {
    echo "  vllm-worker container doesn't exist, creating..."
    ssh $CLU_IP "docker run -d \
        --name vllm-worker \
        --gpus all \
        --network host \
        --privileged \
        --shm-size=64g \
        --restart unless-stopped \
        -v /home/maxvamp/GLM-4.5-Air-AWQ:/model:ro \
        -v /home/maxvamp/.cache/huggingface:/root/.cache/huggingface \
        -e NCCL_SOCKET_IFNAME=enp1s0f0np0 \
        -e NCCL_IB_DISABLE=0 \
        -e GLOO_SOCKET_IFNAME=enp1s0f0np0 \
        -e VLLM_HOST_IP=$CLU_IP \
        nvcr.io/nvidia/vllm:25.11-py3 \
        sleep infinity"
}

echo "Waiting for worker container to start..."
sleep 5

echo ""
echo "=== Step 5: Start Ray worker ==="
ssh $CLU_IP "docker exec -d vllm-worker ray start \
    --address=$SARK_IP:6379 \
    --node-ip-address=$CLU_IP \
    --num-gpus=1 \
    --block"

echo "Waiting for Ray worker to join cluster..."
sleep 10

echo ""
echo "=== Step 6: Verify Ray cluster ==="
docker exec vllm-head ray status 2>/dev/null | head -20 || echo "  (Ray status check failed)"

echo ""
echo "=== Step 7: Start vLLM serve with 128k context + fp8 KV cache ==="
echo "Starting vLLM with:"
echo "  - Max model length: 131072 (128k tokens)"
echo "  - GPU memory utilization: 0.80"
echo "  - KV cache dtype: fp8"
echo "  - Tensor parallel size: 2"
echo "  - Logging to: /home/maxvamp/vllm-logs/server.log"
echo ""

docker exec -d vllm-head bash -c "
  vllm serve /model \
    --host 0.0.0.0 \
    --port 8080 \
    --trust-remote-code \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.80 \
    --max-model-len 131072 \
    --kv-cache-dtype fp8 \
    --max-num-seqs 4 \
    --served-model-name GLM-4.5-Air \
    --enable-chunked-prefill \
    --enable-auto-tool-choice \
    --tool-call-parser glm45 \
    2>&1 | tee /var/log/vllm/server.log &
"

echo "Waiting for model to load (this takes ~2-3 minutes)..."
for i in {1..36}; do
    if curl -s http://localhost:8080/v1/models > /dev/null 2>&1; then
        echo ""
        echo "GLM-4.5-Air API is ready!"
        break
    fi
    echo -n "."
    sleep 5
done

echo ""
echo "=== Step 8: Verify API ==="
echo ""
echo "Testing GLM-4.5-Air API..."
if curl -s http://localhost:8080/v1/models | grep -q "GLM-4.5-Air"; then
    echo "  ✓ GLM-4.5-Air API responding"
    echo ""
    echo "  API details:"
    curl -s http://localhost:8080/v1/models | grep -o '"max_model_len":[0-9]*' || true
else
    echo "  ✗ GLM-4.5-Air API not ready yet (may still be loading)"
fi

echo ""
echo "=============================================="
echo "  STARTUP COMPLETE"
echo "=============================================="
echo ""
echo "Access points:"
echo "  GLM-4.5-Air API:  http://192.168.101.10:8080/v1  (external)"
echo "  ChromaDB:         http://192.168.101.10:8001     (SARK)"
echo "  Memory System:    http://192.168.101.11:3000    (CLU)"
echo "  Server logs:      /home/maxvamp/vllm-logs/server.log"
echo ""
echo "Configuration:"
echo "  - Max context: 128k tokens (131072)"

echo "  - Backup monitoring: http://192.168.101.10:2223/metrics"
echo "  - KV cache: fp8 (memory optimized)"
echo "  - GPU memory: 0.80 utilization"
echo "  - Restart policy: unless-stopped"
echo ""
echo "To view logs:"

echo "  Backup monitoring: tail -f /home/maxvamp/backup-monitoring.log"
echo "  tail -f /home/maxvamp/vllm-logs/server.log"
echo ""

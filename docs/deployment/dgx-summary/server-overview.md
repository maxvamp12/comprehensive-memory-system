# DGX Server Overview

## Executive Summary

This document provides a comprehensive overview of the two NVIDIA DGX Spark (Project DIGITS) servers configured in a Docker Swarm cluster for distributed AI workloads.

## Server Comparison

| Specification | SARK (192.168.68.69) | CLU (192.168.68.71) |
|--------------|----------------------|---------------------|
| Hostname | spark-8b86 | spark-f4cd |
| Role | Swarm Manager (Leader) | Swarm Worker |
| OS | Ubuntu 24.04.3 LTS | Ubuntu 24.04.3 LTS |
| Kernel | 6.14.0-1015-nvidia | 6.14.0-1015-nvidia |
| Architecture | ARM64 (aarch64) | ARM64 (aarch64) |
| Total RAM | 119.7 GiB | 119.7 GiB |
| RAM Used | 107 GiB | 103 GiB |
| Swap | 15 GiB | 15 GiB |
| CPU Model | Cortex-X925 + Cortex-A725 | Cortex-X925 + Cortex-A725 |
| CPU Cores | 20 (10+10 big.LITTLE) | 20 (10+10 big.LITTLE) |
| GPU | NVIDIA GB10 | NVIDIA GB10 |
| GPU Memory | ~97 GB used | ~97 GB used |
| CUDA Version | 13.0 | 13.0 |
| Driver Version | 580.95.05 | 580.95.05 |
| NVMe Storage | 3.7 TB (54% used) | 3.7 TB (37% used) |
| Docker Version | 28.5.1 | 28.5.1 |

## Network Configuration

### Primary Networks

| Network | SARK IP | CLU IP | Purpose |
|---------|---------|--------|---------|
| LAN | 192.168.68.69 | 192.168.68.71 | User access |
| Swarm Management | 192.168.100.10 | 192.168.100.11 | Docker Swarm |
| CONNECT-X Backend | 192.168.101.10 | 192.168.101.11 | High-speed NCCL/vLLM |

### Docker Swarm Configuration

- **Cluster ID**: tk3vml34565l77b7gzhd91wal
- **Manager Address**: 192.168.100.10:2377
- **Data Path Port**: 4789
- **Default Address Pool**: 10.0.0.0/8
- **Nodes**: 2 (SARK as manager, CLU as worker)
- **Default Runtime**: nvidia

## Running Containers

### SARK Server (192.168.68.69)

| Container | Image | Status | Ports | Purpose |
|-----------|-------|--------|-------|---------|
| vllm-head | nvcr.io/nvidia/vllm:25.11-py3 | Up 3 days | host network | vLLM head node (GLM-4.5-Air-AWQ) |
| chromadb | chromadb/chroma:0.5.23 | Up 3 days | 8001:8000 | Vector database |
| open-webui | ghcr.io/open-webui/open-webui:main | Up 3 days | 3000:8080 | Web interface |
| borg-backup-server | borg-docker-borg-server | Up 3 days | 2222:22 | Backup server |

### CLU Server (192.168.68.71)

| Container | Image | Status | Ports | Purpose |
|-----------|-------|--------|-------|---------|
| memory-system | node:18-alpine | Up 3 days | 3000:3000 | Memory system service |
| vllm-worker | nvcr.io/nvidia/vllm:25.11-py3 | Up 3 days | - | vLLM worker node |

## vLLM Configuration

### Head Node (SARK)

- **Image**: nvcr.io/nvidia/vllm:25.11-py3
- **vLLM Version**: 0.11.0+582e4e37
- **Model**: GLM-4.5-Air-AWQ (mounted at /model)
- **Network Mode**: host
- **Runtime**: nvidia (privileged)
- **Shared Memory**: 64 GB
- **NCCL Interface**: enp1s0f0np0 (CONNECT-X)
- **VLLM_HOST_IP**: 192.168.101.10

### Worker Node (CLU)

- **Image**: nvcr.io/nvidia/vllm:25.11-py3
- **Role**: Distributed inference worker
- **Connected to**: Head node via CONNECT-X network

## ChromaDB Configuration

- **Image**: chromadb/chroma:0.5.23
- **Port**: 8001 (external) -> 8000 (internal)
- **Data Path**: /home/maxvamp/chromadb-data
- **Authentication**: admin:admin
- **Workers**: 1
- **Network**: bridge (172.17.0.3)

## System Services

### Key DGX-Specific Services

| Service | Status | Description |
|---------|--------|-------------|
| dgx-dashboard-admin.service | running | NVIDIA DGX Dashboard Admin |
| dgx-dashboard.service | running | NVIDIA DGX Dashboard |
| nvidia-dgx-telemetry.service | running | DGX Telemetry |
| nvidia-persistenced.service | running | GPU Persistence Daemon |

### Custom Services

| Service | Status | Description |
|---------|--------|-------------|
| qwen3-tunnel.service | running | SSH Tunnel for Qwen3-235B API |
| trtllm-proxy.service | running | TRT-LLM API Proxy (CLU:8366 -> 0.0.0.0:9355) |
| twingate-connector.service | running | Remote access connector |

## Storage Configuration

### SARK Storage

| Mount Point | Size | Used | Available | Use% |
|-------------|------|------|-----------|------|
| / (NVMe) | 3.7 TB | 1.9 TB | 1.7 TB | 54% |
| /mnt/borg-backup | 3.6 TB | 1.0 TB | 2.4 TB | 30% |

### CLU Storage

| Mount Point | Size | Used | Available | Use% |
|-------------|------|------|-----------|------|
| / (NVMe) | 3.7 TB | 1.3 TB | 2.2 TB | 37% |

## Resource Usage Summary

### SARK Container Resources

| Container | CPU % | Memory | Memory % |
|-----------|-------|--------|----------|
| vllm-head | 220.29% | 7.25 GiB | 6.05% |
| chromadb | 0.09% | 23.19 MiB | 0.02% |
| open-webui | 0.14% | 359.1 MiB | 0.29% |
| borg-backup-server | 0.00% | 3.85 MiB | 0.00% |

## Key Findings

1. **High GPU Utilization**: Both servers are running vLLM with ~97GB GPU memory usage (nearly full GB10 capacity)

2. **Distributed vLLM Setup**: Head-worker architecture enables distributed inference across both servers

3. **High-Speed Interconnect**: CONNECT-X network (192.168.101.x) provides low-latency GPU-to-GPU communication

4. **ChromaDB Centralized**: Vector database runs only on SARK, accessible via port 8001

5. **Memory System Active**: A Node.js-based memory system is running on CLU

6. **Backup Infrastructure**: Borg backup server on SARK with 3.6TB external storage

7. **RAM Pressure**: Both servers show high memory utilization (~90% on SARK, ~86% on CLU)

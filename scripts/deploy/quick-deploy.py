#!/usr/bin/env python3
"""
Quick deployment script for load balancer
"""

import os
import sys
import subprocess
import time


def main():
    """Main deployment function"""
    print("Load Balancer Quick Deployment")
    print("=" * 40)

    # Build Docker image
    print("Building Docker image...")
    result = subprocess.run(
        ["docker", "build", "-t", "load-balancer:latest", "src/load-balancer/"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print("❌ Failed to build Docker image")
        print(result.stderr)
        return False

    print("✅ Docker image built successfully")

    # Stop existing container
    print("Stopping existing container...")
    subprocess.run(["docker", "stop", "load-balancer"], capture_output=True)
    subprocess.run(["docker", "rm", "load-balancer"], capture_output=True)

    # Run new container
    print("Starting new container...")
    result = subprocess.run(
        [
            "docker",
            "run",
            "-d",
            "--name",
            "load-balancer",
            "-p",
            "8082:8082",
            "-v",
            "load-balancer-data:/app/data",
            "load-balancer:latest",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print("❌ Failed to start container")
        print(result.stderr)
        return False

    container_id = result.stdout.strip()
    print(f"✅ Container started: {container_id}")

    # Wait for container to start
    print("Waiting for container to start...")
    time.sleep(10)

    # Verify deployment
    print("Verifying deployment...")
    result = subprocess.run(
        ["curl", "-f", "http://localhost:8082/health"], capture_output=True, text=True
    )

    if result.returncode == 0:
        print("✅ Deployment successful!")
        print(f"Health check response: {result.stdout}")
        return True
    else:
        print("❌ Health check failed")
        print(result.stderr)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

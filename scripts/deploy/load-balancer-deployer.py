# Deployment Scripts for Load Balancer
# Provides deployment automation for different environments

import os
import sys
import subprocess
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional


class LoadBalancerDeployer:
    """Deployment automation for the load balancer system"""

    def __init__(self, config_file: str = "config/templates/load-balancer-config.yml"):
        self.config_file = config_file
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load deployment configuration"""
        try:
            with open(self.config_file, "r") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"Config file {self.config_file} not found, using defaults")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "services": {
                "chromadb": {
                    "host": "localhost",
                    "port": 8001,
                    "weight": 1,
                    "path": "/api/v2/tenants/default_tenant/databases/default_database",
                    "health_check_path": "/api/v2/heartbeat",
                },
                "memory_service": {
                    "host": "localhost",
                    "port": 3000,
                    "weight": 1,
                    "path": "/health",
                    "health_check_path": "/health",
                },
            },
            "load_balancer": {"host": "0.0.0.0", "port": 8082},
        }

    def build_docker_image(self, tag: str = "load-balancer:latest") -> bool:
        """Build Docker image"""
        try:
            print(f"Building Docker image: {tag}")
            result = subprocess.run(
                ["docker", "build", "-t", tag, "src/load-balancer/"],
                check=True,
                capture_output=True,
                text=True,
            )
            print(f"Image built successfully: {tag}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to build Docker image: {e}")
            print(f"Error output: {e.stderr}")
            return False

    def deploy_to_server(self, server: str, tag: str = "load-balancer:latest") -> bool:
        """Deploy load balancer to remote server"""
        try:
            print(f"Deploying to server: {server}")

            # Copy files to server
            files_to_copy = [
                "src/load-balancer/load-balancer.py",
                "src/load-balancer/Dockerfile",
                "src/config/storage-performance.yml",
            ]

            for file_path in files_to_copy:
                if os.path.exists(file_path):
                    remote_path = (
                        f"{server}:~/load-balancer/{os.path.basename(file_path)}"
                    )
                    print(f"Copying {file_path} to {remote_path}")
                    subprocess.run(["scp", file_path, remote_path], check=True)

            # Build and run on server
            commands = [
                f"cd ~/load-balancer && docker build -t {tag} .",
                f"cd ~/load-balancer && docker stop load-balancer || true",
                f"cd ~/load-balancer && docker rm load-balancer || true",
                f"cd ~/load-balancer && docker run -d --name load-balancer -p 8082:8082 -v ~/load-balancer-data:/app/data {tag}",
            ]

            for cmd in commands:
                print(f"Executing: {cmd}")
                subprocess.run(cmd, shell=True, check=True)

            print(f"Successfully deployed to {server}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"Deployment failed: {e}")
            return False

    def deploy_to_docker_compose(
        self, compose_file: str = "docker-compose.yml"
    ) -> bool:
        """Deploy using Docker Compose"""
        try:
            print(f"Deploying with Docker Compose: {compose_file}")
            result = subprocess.run(
                ["docker-compose", "-f", compose_file, "up", "-d", "--build"],
                check=True,
            )
            print("Docker Compose deployment successful")
            return True
        except subprocess.CalledProcessError as e:
            print(f"Docker Compose deployment failed: {e}")
            return False

    def verify_deployment(self, server: str) -> bool:
        """Verify deployment on remote server"""
        try:
            print(f"Verifying deployment on {server}")

            # Check if container is running
            result = subprocess.run(
                [
                    "ssh",
                    server,
                    "docker",
                    "ps",
                    "--filter",
                    "name=load-balancer",
                    "--format",
                    "{{.Names}}",
                ],
                capture_output=True,
                text=True,
            )

            if result.returncode != 0 or not result.stdout.strip():
                print(f"Load balancer container not running on {server}")
                return False

            # Check health endpoint
            result = subprocess.run(
                ["ssh", server, "curl", "-f", "http://localhost:8082/health"],
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                print(f"Health check failed on {server}: {result.stderr}")
                return False

            print(f"Deployment verified on {server}")
            return True

        except Exception as e:
            print(f"Verification failed: {e}")
            return False

    def rollback_deployment(self, server: str) -> bool:
        """Rollback deployment"""
        try:
            print(f"Rolling back deployment on {server}")

            commands = [
                "docker stop load-balancer || true",
                "docker rm load-balancer || true",
                "docker run -d --name load-balancer-backup -p 8082:8082 -v ~/load-balancer-data:/app/data load-balancer:latest",
            ]

            for cmd in commands:
                subprocess.run(["ssh", server, cmd], check=True)

            print(f"Rollback completed on {server}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"Rollback failed: {e}")
            return False

    def create_deployment_script(self, environment: str = "production") -> str:
        """Create deployment script for specified environment"""
        script_content = f"""#!/bin/bash
# Deployment script for {environment} environment

set -e

echo "Starting deployment for {environment} environment..."

# Load environment configuration
if [ -f "config/environments/.env.{environment}" ]; then
    echo "Loading environment configuration..."
    export $(cat config/environments/.env.{environment} | xargs)
fi

# Build Docker image
echo "Building Docker image..."
docker build -t load-balancer:latest src/load-balancer/

# Stop existing container
echo "Stopping existing container..."
docker stop load-balancer || true
docker rm load-balancer || true

# Run new container
echo "Starting new container..."
docker run -d \\
    --name load-balancer \\
    -p 8082:8082 \\
    -v load-balancer-data:/app/data \\
    --env-file config/environments/.env.{environment} \\
    load-balancer:latest

# Verify deployment
echo "Verifying deployment..."
sleep 10
if curl -f http://localhost:8082/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    echo "Rolling back..."
    docker stop load-balancer || true
    docker rm load-balancer || true
    exit 1
fi

echo "✅ {environment} deployment completed successfully!"
"""

        script_path = f"scripts/deploy/deploy-{environment}.sh"
        with open(script_path, "w") as f:
            f.write(script_content)

        os.chmod(script_path, 0o755)
        return script_path


def main():
    """Main deployment function"""
    deployer = LoadBalancerDeployer()

    # Example usage
    print("Load Balancer Deployer")
    print("=" * 50)

    # Build Docker image
    if deployer.build_docker_image():
        print("✅ Docker image built successfully")
    else:
        print("❌ Failed to build Docker image")
        return

    # Create deployment script
    script_path = deployer.create_deployment_script("production")
    print(f"✅ Deployment script created: {script_path}")

    # Deploy to server (if specified)
    if len(sys.argv) > 1:
        server = sys.argv[1]
        if deployer.deploy_to_server(server):
            if deployer.verify_deployment(server):
                print(f"✅ Deployment to {server} successful")
            else:
                print(f"❌ Verification failed for {server}")
                deployer.rollback_deployment(server)
        else:
            print(f"❌ Deployment to {server} failed")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Storage Service HTTP Load Balancer
Implements weighted round-robin load balancing with health checks
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import threading
import time
import logging
import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import signal


@dataclass
class ServiceEndpoint:
    """Represents a backend service endpoint"""

    name: str
    host: str
    port: int
    path: str
    weight: int
    healthy: bool = True
    last_check: float = 0
    check_count: int = 0
    failure_count: int = 0


class LoadBalancer:
    """
    HTTP Load Balancer with weighted round-robin algorithm
    Supports health checks and service discovery
    """

    def __init__(self, config_file: str = "storage-performance.yml"):
        self.config_file = config_file
        self.services: Dict[str, ServiceEndpoint] = {}
        self.current_index: Dict[str, int] = {}
        self.health_check_interval = 30
        self.health_check_timeout = 10
        self.health_check_threshold = 3

        # Setup logging
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
        )
        self.logger = logging.getLogger(__name__)

        # Initialize services
        self._initialize_services()

        # Start health checker
        self.health_checker = threading.Thread(
            target=self._health_checker_worker, daemon=True
        )
        self.health_checker.start()

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        sys.exit(0)

    def _initialize_services(self):
        """Initialize service endpoints from configuration"""
        # Default services for now
        services_config = {
            "chromadb": {
                "host": "192.168.68.69",
                "port": 8001,
                "weight": 1,
                "path": "/api/v2",
            },
            "memory_service": {
                "host": "192.168.68.71",
                "port": 3000,
                "weight": 1,
                "path": "/health",
            },
        }

        for service_name, service_config in services_config.items():
            service = ServiceEndpoint(
                name=service_name,
                host=service_config["host"],
                port=service_config["port"],
                path=service_config["path"],
                weight=service_config["weight"],
            )
            self.services[service_name] = service
            self.current_index[service_name] = 0

        self.logger.info(f"Initialized {len(self.services)} service endpoints")

    def _health_checker_worker(self):
        """Background worker for health checks"""
        while True:
            self._perform_health_checks()
            time.sleep(self.health_check_interval)

    def _perform_health_checks(self):
        """Perform health checks on all services"""
        for service_name, service in self.services.items():
            try:
                is_healthy = self._check_service_health(service)

                if is_healthy != service.healthy:
                    service.healthy = is_healthy
                    if is_healthy:
                        service.failure_count = 0
                        self.logger.info(f"Service {service_name} is now healthy")
                    else:
                        self.logger.warning(f"Service {service_name} is now unhealthy")

                service.last_check = time.time()
                service.check_count += 1

            except Exception as e:
                self.logger.error(f"Health check failed for {service_name}: {e}")
                service.failure_count += 1
                service.healthy = False

    def _check_service_health(self, service: ServiceEndpoint) -> bool:
        """Check if a service is healthy"""
        try:
            # Health check URL - some services have health at root, others under path
            if service.name == "memory_service":
                url = f"http://{service.host}:{service.port}/health"
            elif "heartbeat" in service.path:
                # For services with heartbeat in path, use it directly
                url = f"http://{service.host}:{service.port}{service.path}"
            else:
                # For other services, use the path + health
                if service.path.endswith("/"):
                    health_path = service.path + "health"
                else:
                    health_path = service.path + "/" + "health"
                url = f"http://{service.host}:{service.port}{health_path}"

            # Log the URL being checked
            self.logger.info(f"Checking health URL: {url}")

            # Create request with timeout
            req = urllib.request.Request(url, method="GET")
            req.add_header("User-Agent", "Storage-Service-Load-Balancer/1.0")

            # Set timeout
            response = urllib.request.urlopen(req, timeout=self.health_check_timeout)

            # Check response status
            if response.status == 200:
                return True
            else:
                self.logger.warning(
                    f"Health check failed for {service.name}: HTTP {response.status}"
                )
                return False

        except urllib.error.URLError as e:
            self.logger.warning(f"Health check failed for {service.name}: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error checking {service.name}: {e}")
            return False

    def _get_next_service(self, service_name: str) -> Optional[ServiceEndpoint]:
        """Get next service using weighted round-robin algorithm"""
        if service_name not in self.services:
            return None

        service = self.services[service_name]
        if not service.healthy:
            return None

        # Simple round-robin for now (can be extended for weighted)
        index = self.current_index[service_name]
        self.current_index[service_name] = (index + 1) % 1  # Single service for now

        return service

    def _proxy_request(
        self,
        service: ServiceEndpoint,
        path: str,
        method: str,
        headers: Dict[str, str] = None,
        data: str = None,
    ) -> bytes:
        """Proxy request to backend service"""
        # Special handling for memory service
        if service.name == "memory_service":
            if path == "/health":
                target_url = f"http://{service.host}:{service.port}/health"
            else:
                target_url = f"http://{service.host}:{service.port}{service.path}{path}"
        else:
            target_url = f"http://{service.host}:{service.port}{service.path}{path}"

        # Debug log
        self.logger.info(f"Proxying {service.name} request: {target_url}")

        req = urllib.request.Request(target_url, method=method)

        # Copy headers
        if headers:
            for key, value in headers.items():
                req.add_header(key, value)

        # Add load balancer header
        req.add_header("X-Forwarded-By", "storage-service-load-balancer")

        # Add data for POST requests
        if data and method.upper() == "POST":
            req.add_header("Content-Type", "application/json")
            req.data = data.encode("utf-8")

        try:
            response = urllib.request.urlopen(req, timeout=30)
            return response.read()
        except Exception as e:
            self.logger.error(f"Proxy request failed for {service.name}: {e}")
            raise


class LoadBalancerHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for load balancer"""

    def do_GET(self):
        """Handle GET requests"""
        try:
            self._handle_request()
        except Exception as e:
            self._send_error(500, f"Internal Server Error: {e}")

    def do_POST(self):
        """Handle POST requests"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")

            self._handle_request(method="POST", data=post_data)
        except Exception as e:
            self._send_error(500, f"Internal Server Error: {e}")

    def _handle_request(self, method: str = "GET", data: str = None):
        """Handle incoming request"""
        # Get service name from path or default
        service_name = "chromadb"  # Default service
        path = self.path

        # Extract service name if specified in path
        if self.path.startswith("/service/"):
            parts = self.path.split("/")
            if len(parts) >= 3:
                service_name = parts[2]
                path = "/" + "/".join(parts[3:])

        # Get service endpoint
        service = self.server.load_balancer._get_next_service(service_name)
        if not service:
            self._send_error(503, f"Service {service_name} is unavailable")
            return

        # Forward request to backend service
        try:
            response_data = self.server.load_balancer._proxy_request(
                service, path, method, dict(self.headers), data
            )

            # Send response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-Service-Name", service.name)
            self.end_headers()
            self.wfile.write(response_data)

        except Exception as e:
            self._send_error(502, f"Bad Gateway: {e}")

    def _send_error(self, code: int, message: str):
        """Send error response"""
        response = json.dumps({"error": message}).encode("utf-8")

        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        """Override log message to use our logger"""
        self.server.load_balancer.logger.info(format % args)


class LoadBalancerServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Threaded HTTP server for load balancer"""

    def __init__(self, server_address, handler_class, load_balancer):
        super().__init__(server_address, handler_class)
        self.load_balancer = load_balancer


def main():
    """Main function to start load balancer"""
    # Initialize load balancer
    load_balancer = LoadBalancer()

    # Setup server
    port = 8082
    server = LoadBalancerServer(("0.0.0.0", port), LoadBalancerHandler, load_balancer)

    print(f"Load balancer starting on port {port}...")
    print("Services configured:")
    for name, service in load_balancer.services.items():
        print(f"  - {name}: http://{service.host}:{service.port}{service.path}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down load balancer...")
        server.shutdown()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Simple Storage Service HTTP Load Balancer with Redis caching
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
import hashlib
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import signal


@dataclass
class ServiceEndpoint:
    name: str
    host: str
    port: int
    path: str
    weight: int
    healthy: bool = True
    last_check: float = 0
    check_count: int = 0
    failure_count: int = 0


class SimpleLoadBalancer:
    def __init__(self):
        self.services = {}
        self.redis_host = "192.168.68.69"
        self.redis_port = 6380
        self.redis_enabled = False
        self.cache_ttl = 300

        # Setup simple logging
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
        )
        self.logger = logging.getLogger(__name__)

        # Initialize services
        self._initialize_services()
        self._initialize_redis()

        # Start health checker
        self.health_checker = threading.Thread(
            target=self._health_checker_worker, daemon=True
        )
        self.health_checker.start()

        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        print(f"Received signal {signum}, shutting down...")
        sys.exit(0)

    def _initialize_services(self):
        self.services = {
            "chromadb": ServiceEndpoint(
                name="chromadb",
                host="192.168.68.69",
                port=8001,
                path="/api/v2/heartbeat",
                weight=1,
            ),
            "memory_service": ServiceEndpoint(
                name="memory_service",
                host="192.168.68.71",
                port=3000,
                path="/health",
                weight=1,
            ),
        }
        self.logger.info(f"Initialized {len(self.services)} service endpoints")

    def _initialize_redis(self):
        try:
            redis_url = f"http://{self.redis_host}:{self.redis_port}/ping"
            req = urllib.request.Request(redis_url, method="GET")
            response = urllib.request.urlopen(req, timeout=5)
            if response.status == 200:
                self.logger.info("Redis caching connection established")
                self.redis_enabled = True
        except Exception as e:
            self.logger.warning(f"Redis connection failed: {e}")
            self.redis_enabled = False

    def _get_cache_key(
        self, service_name: str, method: str, path: str, data: str = ""
    ) -> str:
        key_components = [service_name, method, path]
        if data:
            key_components.append(data)
        key_string = "|".join(key_components)
        return hashlib.md5(key_string.encode()).hexdigest()

    def _get_from_cache(self, cache_key: str) -> str:
        if not self.redis_enabled:
            return ""
        try:
            redis_url = f"http://{self.redis_host}:{self.redis_port}/get/{cache_key}"
            req = urllib.request.Request(redis_url, method="GET")
            response = urllib.request.urlopen(req, timeout=5)
            if response.status == 200:
                return response.read().decode("utf-8")
            return ""
        except Exception as e:
            return ""

    def _set_cache(self, cache_key: str, data: str, ttl: int = None):
        if not self.redis_enabled:
            return
        try:
            if ttl is None:
                ttl = self.cache_ttl
            redis_url = f"http://{self.redis_host}:{self.redis_port}/set/{cache_key}"
            req = urllib.request.Request(redis_url, method="POST")
            req.add_header("Content-Type", "application/json")
            req.data = json.dumps({"data": data, "ttl": ttl}).encode("utf-8")
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass

    def _health_checker_worker(self):
        while True:
            self._perform_health_checks()
            time.sleep(30)

    def _perform_health_checks(self):
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
        try:
            if service.name == "memory_service":
                url = f"http://{service.host}:{service.port}/health"
            elif "heartbeat" in service.path:
                url = f"http://{service.host}:{service.port}{service.path}"
            else:
                health_path = (
                    service.path + "/health"
                    if not service.path.endswith("/")
                    else service.path + "health"
                )
                url = f"http://{service.host}:{service.port}{health_path}"

            req = urllib.request.Request(url, method="GET")
            req.add_header("User-Agent", "Storage-Service-Load-Balancer/1.0")
            response = urllib.request.urlopen(req, timeout=10)
            return response.status == 200
        except Exception:
            return False

    def _get_next_service(self, service_name: str) -> Optional[ServiceEndpoint]:
        if service_name not in self.services:
            return None
        service = self.services[service_name]
        return service if service.healthy else None

    def _proxy_request(
        self, service: ServiceEndpoint, path: str, method: str, headers: Dict, data: str
    ) -> bytes:
        if service.name == "memory_service":
            if path == "/health":
                target_url = f"http://{service.host}:{service.port}/health"
            else:
                target_url = f"http://{service.host}:{service.port}{service.path}{path}"
        else:
            target_url = f"http://{service.host}:{service.port}{service.path}{path}"

        req = urllib.request.Request(target_url, method=method)
        if headers:
            for key, value in headers.items():
                req.add_header(key, value)
        req.add_header("X-Forwarded-By", "storage-service-load-balancer")

        if data and method.upper() == "POST":
            req.add_header("Content-Type", "application/json")
            req.data = data.encode("utf-8")

        response = urllib.request.urlopen(req, timeout=30)
        return response.read()


class LoadBalancerHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            self._handle_request()
        except Exception as e:
            self._send_error(500, f"Internal Server Error: {e}")

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            self._handle_request(method="POST", data=post_data)
        except Exception as e:
            self._send_error(500, f"Internal Server Error: {e}")

    def _handle_request(self, method: str = "GET", data: str = ""):
        service_name = "chromadb"
        path = self.path

        if self.path.startswith("/service/"):
            parts = self.path.split("/")
            if len(parts) >= 3:
                service_name = parts[2]
                path = "/" + "/".join(parts[3:])

        service = self.server.load_balancer._get_next_service(service_name)
        if not service:
            self._send_error(503, f"Service {service_name} is unavailable")
            return

        # Try cache first for GET requests
        cache_key = ""
        cached_response = ""
        if method == "GET":
            cache_key = self.server.load_balancer._get_cache_key(
                service_name, method, path, data
            )
            cached_response = self.server.load_balancer._get_from_cache(cache_key)
            if cached_response:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Cache", "HIT")
                self.end_headers()
                self.wfile.write(cached_response.encode("utf-8"))
                return

        # Forward to backend service
        try:
            response_data = self.server.load_balancer._proxy_request(
                service, path, method, dict(self.headers), data
            )

            # Cache GET responses
            if method == "GET" and response_data:
                try:
                    response_str = response_data.decode("utf-8")
                    self.server.load_balancer._set_cache(cache_key, response_str)
                except:
                    pass

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-Service-Name", service.name)
            if method == "GET" and cached_response:
                self.send_header("X-Cache", "MISS")
            self.end_headers()
            self.wfile.write(response_data)

        except Exception as e:
            self._send_error(502, f"Bad Gateway: {e}")

    def _send_error(self, code: int, message: str):
        response = json.dumps({"error": message}).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        self.server.load_balancer.logger.info(format % args)


class LoadBalancerServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    def __init__(self, server_address, handler_class, load_balancer):
        super().__init__(server_address, handler_class)
        self.load_balancer = load_balancer


def main():
    load_balancer = SimpleLoadBalancer()
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

#!/usr/bin/env python3
"""
Connection Pooling System for Database and Service Optimization
Implements efficient connection management for improved performance using standard urllib
"""

import time
import json
import logging
import threading
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import queue
import urllib.request
import urllib.error
import urllib.parse
import ssl
import socket
from contextlib import contextmanager


@dataclass
class ConnectionConfig:
    """Connection configuration parameters"""

    max_connections: int = 10
    timeout: float = 30.0
    retry_attempts: int = 3
    retry_delay: float = 1.0
    keepalive_timeout: float = 300.0
    ssl_verify: bool = False
    compression: bool = True
    tcp_nodelay: bool = True


@dataclass
class PoolStats:
    """Connection pool statistics"""

    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    hit_rate: float = 0.0
    created_at: float = 0.0

    def update_hit_rate(self, hits: int, total: int):
        """Update cache hit rate"""
        if total > 0:
            self.hit_rate = (hits / total) * 100


class ConnectionPool:
    """
    High-performance connection pool for HTTP services
    Implements connection reuse, timeout management, and health monitoring
    """

    def __init__(self, endpoint: str, config: ConnectionConfig, max_size: int = 100):
        self.endpoint = endpoint
        self.config = config
        self.connections: queue.Queue = queue.Queue(maxsize=config.max_connections)
        self.active_connections: set = set()
        self.stats = PoolStats()
        self.health_check_thread = threading.Thread(
            target=self._health_monitor, daemon=True
        )
        self.lock = threading.RLock()
        self.stats.created_at = time.time()

        # Initialize pool
        self._initialize_pool()

        # Start health monitoring
        self.health_check_thread.start()

    def _initialize_pool(self):
        """Initialize connection pool with minimum connections"""
        initial_size = min(3, self.config.max_connections)
        for _ in range(initial_size):
            try:
                connection = self._create_connection()
                self.connections.put(connection)
            except Exception as e:
                logging.warning(f"Failed to create initial connection: {e}")

    def _create_connection(self) -> Dict[str, Any]:
        """Create a new HTTP connection configuration"""
        return {
            "endpoint": self.endpoint,
            "created_at": time.time(),
            "last_used": time.time(),
            "healthy": True,
        }

    def _validate_connection(self, connection: Dict[str, Any]) -> bool:
        """Validate that connection is healthy"""
        try:
            # Check if connection is too old
            if time.time() - connection["last_used"] > self.config.keepalive_timeout:
                return False

            # Simple health check
            test_url = f"{self.endpoint}/health"
            req = urllib.request.Request(test_url, method="GET")
            req.add_header("User-Agent", "Connection-Pool-Optimizer/1.0")

            response = urllib.request.urlopen(req, timeout=5)
            return response.status == 200

        except Exception:
            return False

    def _health_monitor(self):
        """Background health monitoring thread"""
        while True:
            time.sleep(60)  # Check every minute
            self._cleanup_connections()

    def _cleanup_connections(self):
        """Clean up unhealthy connections"""
        with self.lock:
            # Remove unhealthy connections
            while not self.connections.empty():
                try:
                    conn = self.connections.get_nowait()
                    if not self._validate_connection(conn):
                        conn["healthy"] = False
                    else:
                        # Put it back if healthy
                        self.connections.put_nowait(conn)
                except queue.Empty:
                    break

    def get_connection(self) -> Dict[str, Any]:
        """Get a connection from the pool"""
        with self.lock:
            # Try to get an existing connection
            try:
                connection = self.connections.get_nowait()
                self.active_connections.add(connection)
                self.stats.active_connections += 1
                self.stats.idle_connections -= 1
                connection["last_used"] = time.time()
                return connection
            except queue.Empty:
                # Create new connection if pool is empty
                if len(self.active_connections) < self.config.max_connections:
                    connection = self._create_connection()
                    self.active_connections.add(connection)
                    self.stats.total_connections += 1
                    self.stats.active_connections += 1
                    return connection
                else:
                    raise ConnectionError("Connection pool exhausted")

    def release_connection(self, connection: Dict[str, Any]):
        """Release connection back to pool"""
        with self.lock:
            if connection in self.active_connections:
                self.active_connections.remove(connection)
                self.stats.active_connections -= 1
                self.stats.idle_connections += 1

                # Validate before returning to pool
                if self._validate_connection(connection):
                    try:
                        self.connections.put_nowait(connection)
                    except queue.Full:
                        # Pool is full, connection is discarded
                        pass

    def request(
        self,
        method: str,
        path: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make a request through the connection pool"""
        connection = None
        start_time = time.time()

        try:
            connection = self.get_connection()

            url = f"{self.endpoint}{path}"

            # Prepare request
            request_headers = {
                "Content-Type": "application/json",
                "User-Agent": "Connection-Pool-Optimizer/1.0",
                "X-Pool-ID": str(id(self)),
            }
            if headers:
                request_headers.update(headers)

            # Make request with retry logic
            for attempt in range(self.config.retry_attempts):
                try:
                    if method.upper() == "GET":
                        # Build URL with params
                        if params:
                            query_string = urllib.parse.urlencode(params)
                            url = (
                                f"{url}?{query_string}"
                                if "?" not in url
                                else f"{url}&{query_string}"
                            )

                        req = urllib.request.Request(url, method="GET")
                        for key, value in request_headers.items():
                            req.add_header(key, value)

                        response = urllib.request.urlopen(
                            req, timeout=self.config.timeout
                        )

                    elif method.upper() == "POST":
                        # Build JSON data
                        json_data = json.dumps(data).encode("utf-8")
                        req = urllib.request.Request(
                            url, data=json_data, method="POST", headers=request_headers
                        )

                        response = urllib.request.urlopen(
                            req, timeout=self.config.timeout
                        )
                    else:
                        raise ValueError(f"Unsupported method: {method}")

                    # Parse response
                    response_data = response.read().decode("utf-8")
                    try:
                        result = json.loads(response_data)
                    except json.JSONDecodeError:
                        result = {"data": response_data, "status": response.status}

                    self.stats.total_requests += 1

                    # Update response time
                    response_time = time.time() - start_time
                    self.stats.avg_response_time = (
                        self.stats.avg_response_time * (self.stats.total_requests - 1)
                        + response_time
                    ) / self.stats.total_requests

                    return result

                except (urllib.error.URLError, socket.timeout, socket.error) as e:
                    if attempt == self.config.retry_attempts - 1:
                        raise e
                    time.sleep(
                        self.config.retry_delay * (2**attempt)
                    )  # Exponential backoff

        finally:
            if connection:
                self.release_connection(connection)

    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        return asdict(self.stats)

    def close_all(self):
        """Close all connections in the pool"""
        with self.lock:
            # Clear active connections
            self.active_connections.clear()

            # Clear idle connections
            while not self.connections.empty():
                try:
                    self.connections.get_nowait()
                except queue.Empty:
                    break

            # Reset stats
            self.stats = PoolStats()
            self.stats.created_at = time.time()


class ConnectionPoolManager:
    """
    Manages multiple connection pools for different services
    Provides centralized connection management and monitoring
    """

    def __init__(self):
        self.pools: Dict[str, ConnectionPool] = {}
        self.configs: Dict[str, ConnectionConfig] = {}
        self.global_stats = {
            "total_pools": 0,
            "active_pools": 0,
            "total_connections": 0,
            "avg_response_time": 0.0,
        }

    def add_pool(self, name: str, endpoint: str, config: ConnectionConfig):
        """Add a new connection pool"""
        if name not in self.pools:
            self.pools[name] = ConnectionPool(endpoint, config)
            self.configs[name] = config
            self.global_stats["total_pools"] += 1
            self.global_stats["active_pools"] += 1
            logging.info(f"Added connection pool: {name} -> {endpoint}")

    def get_pool(self, name: str) -> Optional[ConnectionPool]:
        """Get connection pool by name"""
        return self.pools.get(name)

    def request(
        self,
        pool_name: str,
        method: str,
        path: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make request through specified connection pool"""
        pool = self.get_pool(pool_name)
        if not pool:
            raise ValueError(f"Connection pool '{pool_name}' not found")

        return pool.request(method, path, params, data, headers)

    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all connection pools"""
        stats = {}
        total_connections = 0
        total_requests = 0
        total_response_time = 0.0

        for name, pool in self.pools.items():
            pool_stat = pool.get_stats()
            stats[name] = pool_stat
            total_connections += pool_stat.total_connections
            total_requests += pool_stat.total_requests
            total_response_time += (
                pool_stat.avg_response_time * pool_stat.total_requests
            )

        self.global_stats["total_connections"] = total_connections
        if total_requests > 0:
            self.global_stats["avg_response_time"] = (
                total_response_time / total_requests
            )

        return {"pools": stats, "global": self.global_stats}

    def close_all_pools(self):
        """Close all connection pools"""
        for pool in self.pools.values():
            pool.close_all()

        self.pools.clear()
        self.configs.clear()
        self.global_stats["active_pools"] = 0


# Global connection pool manager instance
_pool_manager = ConnectionPoolManager()


def get_pool_manager() -> ConnectionPoolManager:
    """Get global connection pool manager"""
    return _pool_manager


def initialize_connection_pools():
    """Initialize connection pools for all services"""
    # ChromaDB connection pool
    chromadb_config = ConnectionConfig(
        max_connections=15, timeout=20.0, retry_attempts=3, keepalive_timeout=300.0
    )
    _pool_manager.add_pool("chromadb", "http://192.168.68.69:8001", chromadb_config)

    # Memory Service connection pool
    memory_config = ConnectionConfig(
        max_connections=10, timeout=15.0, retry_attempts=2, keepalive_timeout=300.0
    )
    _pool_manager.add_pool("memory_service", "http://192.168.68.71:3000", memory_config)

    # Redis connection pool
    redis_config = ConnectionConfig(
        max_connections=5, timeout=10.0, retry_attempts=2, keepalive_timeout=300.0
    )
    _pool_manager.add_pool("redis_cache", "http://192.168.68.69:6380", redis_config)

    logging.info("Connection pools initialized successfully")


if __name__ == "__main__":
    # Test the connection pooling system
    logging.basicConfig(level=logging.INFO)

    # Initialize pools
    initialize_connection_pools()

    # Test basic functionality
    manager = get_pool_manager()

    # Test ChromaDB pool
    try:
        result = manager.request("chromadb", "GET", "/api/v2/heartbeat")
        print(f"ChromaDB test result: {result}")
    except Exception as e:
        print(f"ChromaDB test failed: {e}")

    # Test Memory Service pool
    try:
        result = manager.request("memory_service", "GET", "/health")
        print(f"Memory Service test result: {result}")
    except Exception as e:
        print(f"Memory Service test failed: {e}")

    # Display statistics
    stats = manager.get_all_stats()
    print(f"Connection Pool Statistics: {json.dumps(stats, indent=2, default=str)}")

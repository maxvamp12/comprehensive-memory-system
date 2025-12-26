#!/usr/bin/env python3
"""
Storage Service Caching System
Implements intelligent caching for storage service performance optimization
"""

import time
import json
import hashlib
import logging
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import threading
from datetime import datetime, timedelta
import pickle
import os


@dataclass
class CacheEntry:
    """Represents a cache entry with metadata"""

    key: str
    value: Any
    created_at: float
    accessed_at: float
    ttl: int
    hit_count: int = 0

    def is_expired(self) -> bool:
        """Check if cache entry has expired"""
        return time.time() - self.created_at > self.ttl

    def update_access(self):
        """Update last access time and increment hit count"""
        self.accessed_at = time.time()
        self.hit_count += 1


class CacheManager:
    """
    Intelligent caching system for storage services
    Provides LRU eviction, TTL management, and multi-level caching
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, CacheEntry] = {}
        self.lock = threading.RLock()
        self.stats = {"hits": 0, "misses": 0, "evictions": 0, "insertions": 0}

        # Start background cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()

        # Load existing cache if available
        self._load_cache()

    def _load_cache(self):
        """Load cached data from persistent storage"""
        cache_file = "/tmp/storage_cache.pkl"
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    self.cache = pickle.load(f)
                logging.info(f"Loaded {len(self.cache)} cache entries from disk")
            except Exception as e:
                logging.error(f"Failed to load cache: {e}")

    def _save_cache(self):
        """Save cached data to persistent storage"""
        cache_file = "/tmp/storage_cache.pkl"
        try:
            with open(cache_file, "wb") as f:
                pickle.dump(self.cache, f)
        except Exception as e:
            logging.error(f"Failed to save cache: {e}")

    def _cleanup_worker(self):
        """Background thread for expired cache cleanup"""
        while True:
            time.sleep(60)  # Run every minute
            self._cleanup_expired()

    def _cleanup_expired(self):
        """Remove expired cache entries"""
        with self.lock:
            expired_keys = []
            for key, entry in self.cache.items():
                if entry.is_expired():
                    expired_keys.append(key)

            for key in expired_keys:
                del self.cache[key]
                self.stats["evictions"] += 1

            if expired_keys:
                logging.info(f"Cleaned up {len(expired_keys)} expired cache entries")
                self._save_cache()

    def _evict_lru(self):
        """Evict least recently used item when cache is full"""
        if len(self.cache) >= self.max_size:
            # Find least recently used item
            lru_key = min(self.cache.keys(), key=lambda k: self.cache[k].accessed_at)
            del self.cache[lru_key]
            self.stats["evictions"] += 1
            logging.debug(f"Evicted LRU item: {lru_key}")

    def get(self, key: str, default=None) -> Any:
        """Get value from cache with key"""
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if not entry.is_expired():
                    entry.update_access()
                    self.stats["hits"] += 1
                    return entry.value
                else:
                    # Remove expired entry
                    del self.cache[key]
                    self.stats["misses"] += 1
                    return default
            self.stats["misses"] += 1
            return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        if ttl is None:
            ttl = self.default_ttl

        with self.lock:
            # Evict if cache is full
            self._evict_lru()

            # Create new entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=time.time(),
                accessed_at=time.time(),
                ttl=ttl,
            )

            self.cache[key] = entry
            self.stats["insertions"] += 1

            # Save to disk
            self._save_cache()

            return True

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                self._save_cache()
                return True
            return False

    def clear(self):
        """Clear all cache entries"""
        with self.lock:
            self.cache.clear()
            self._save_cache()
            logging.info("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (
            (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        )

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": hit_rate,
            "evictions": self.stats["evictions"],
            "insertions": self.stats["insertions"],
        }


class ServiceCacheProxy:
    """
    Proxy class that caches responses from storage services
    Provides intelligent caching with service-specific configurations
    """

    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
        self.service_configs = {
            "chromadb": {
                "endpoint": "http://192.168.68.69:8001",
                "cache_ttl": 120,  # 2 minutes
                "cache_keys": ["query", "collection", "limit"],
            },
            "memory_service": {
                "endpoint": "http://192.168.68.71:3000",
                "cache_ttl": 60,  # 1 minute
                "cache_keys": ["query", "domain", "limit"],
            },
        }

    def _generate_cache_key(self, service: str, params: Dict[str, Any]) -> str:
        """Generate unique cache key based on service and parameters"""
        config = self.service_configs.get(service, {})
        relevant_params = {
            k: v for k, v in params.items() if k in config.get("cache_keys", [])
        }
        key_str = json.dumps(relevant_params, sort_keys=True)
        return f"{service}_{hashlib.md5(key_str.encode()).hexdigest()}"

    def cached_request(
        self,
        service: str,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make cached request to service"""
        if params is None:
            params = {}
        if data is None:
            data = {}

        # Generate cache key
        cache_key = self._generate_cache_key(service, params)

        # Try cache first
        cached_result = self.cache.get(cache_key)
        if cached_result is not None:
            logging.debug(f"Cache hit for {service} request")
            return cached_result

        # Make actual request
        try:
            service_config = self.service_configs.get(service, {})
            service_endpoint = service_config.get("endpoint", endpoint)
            cache_ttl = service_config.get("cache_ttl", 300)

            url = f"{service_endpoint}{endpoint}"

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
                response = urllib.request.urlopen(req, timeout=10)
            elif method.upper() == "POST":
                # Build JSON data
                json_data = json.dumps(data).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=json_data,
                    method="POST",
                    headers={"Content-Type": "application/json"},
                )
                response = urllib.request.urlopen(req, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            result = response.json()

            # Cache the result
            self.cache.set(cache_key, result, cache_ttl)
            logging.debug(f"Cached result for {service} request")

            return result

        except Exception as e:
            logging.error(f"Request to {service} failed: {e}")
            raise

    def invalidate_cache(self, service: str, params: Optional[Dict[str, Any]] = None):
        """Invalidate cache entries for a specific service"""
        if params is None:
            # Invalidate all entries for this service
            keys_to_remove = [
                k for k in self.cache.cache.keys() if k.startswith(f"{service}_")
            ]
            for key in keys_to_remove:
                self.cache.delete(key)
        else:
            # Invalidate specific entry
            cache_key = self._generate_cache_key(service, params)
            self.cache.delete(cache_key)


def create_cache_system(max_size: int = 1000, default_ttl: int = 300) -> CacheManager:
    """Factory function to create cache system"""
    return CacheManager(max_size=max_size, default_ttl=default_ttl)


def create_service_proxy(cache_manager: CacheManager) -> ServiceCacheProxy:
    """Factory function to create service proxy"""
    return ServiceCacheProxy(cache_manager)


# Global cache instance
_cache_manager = None
_service_proxy = None


def get_cache_manager() -> CacheManager:
    """Get global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = create_cache_system()
    return _cache_manager


def get_service_proxy() -> ServiceCacheProxy:
    """Get global service proxy instance"""
    global _service_proxy
    if _service_proxy is None:
        _service_proxy = create_service_proxy(get_cache_manager())
    return _service_proxy


if __name__ == "__main__":
    # Test the caching system
    logging.basicConfig(level=logging.INFO)

    cache = get_cache_manager()
    proxy = get_service_proxy()

    # Test basic caching
    cache.set("test_key", {"data": "test_value"}, ttl=60)
    result = cache.get("test_key")
    print(f"Cache result: {result}")

    # Test stats
    stats = cache.get_stats()
    print(f"Cache stats: {stats}")

    print("Storage caching system initialized successfully")

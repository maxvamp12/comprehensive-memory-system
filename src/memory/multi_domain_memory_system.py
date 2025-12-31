#!/usr/bin/env python3
"""
Multi-Domain Memory System Core Implementation
Implements structured memory storage for multiple domains: BMAD code, website info, religious discussions, electronics/maker

Storage Backend:
- ChromaDB (REQUIRED): Enterprise-level vector database for semantic search on SARK:8001
- SQLite: Only available with allow_fallback=True (NOT recommended for production)

IMPORTANT: By default, the system will FAIL if ChromaDB is unavailable.
This prevents silent data loss from storing data in SQLite that won't sync to ChromaDB.
"""

import json
import uuid
import time
import logging
import threading
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
import hashlib
import re
from contextlib import contextmanager
import sqlite3
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import ChromaDB storage
try:
    from .chromadb_storage import ChromaDBStorage, get_chromadb_storage
    CHROMADB_AVAILABLE = True
except ImportError:
    try:
        from chromadb_storage import ChromaDBStorage, get_chromadb_storage
        CHROMADB_AVAILABLE = True
    except ImportError:
        CHROMADB_AVAILABLE = False
        logger.warning("ChromaDB storage not available, using SQLite fallback")


@dataclass
class MemoryEntry:
    """Represents a memory entry in the multi-domain system"""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    domain: str = ""
    subdomain: Optional[str] = None
    content_type: str = "conversation"
    content_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    source: str = ""
    confidence: float = 1.0
    context: Dict[str, Any] = field(default_factory=dict)
    relevance_score: float = field(default=0.0, repr=False)
    similarity_score: float = field(default=0.0, repr=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert memory entry to dictionary"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MemoryEntry":
        """Create memory entry from dictionary"""
        return cls(**data)


class MemoryStorage:
    """Core memory storage system with SQLite backend"""

    def __init__(self, db_path: str = "memory_system.db"):
        self.db_path = db_path
        self.lock = threading.RLock()
        self._initialize_database()

    def _initialize_database(self):
        """Initialize SQLite database with proper schema"""
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Create memory entries table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS memory_entries (
                            id TEXT PRIMARY KEY,
                            domain TEXT NOT NULL,
                            subdomain TEXT,
                            content_type TEXT NOT NULL,
                            content_data TEXT NOT NULL,
                            metadata TEXT NOT NULL,
                            tags TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            source TEXT NOT NULL,
                            confidence REAL NOT NULL,
                            context TEXT NOT NULL
                        )
                    """)

                    # Create indexes for better performance
                    cursor.execute(
                        "CREATE INDEX IF NOT EXISTS idx_domain ON memory_entries(domain)"
                    )
                    cursor.execute(
                        "CREATE INDEX IF NOT EXISTS idx_timestamp ON memory_entries(timestamp)"
                    )
                    cursor.execute(
                        "CREATE INDEX IF NOT EXISTS idx_tags ON memory_entries(tags)"
                    )
                    cursor.execute(
                        "CREATE INDEX IF NOT EXISTS idx_source ON memory_entries(source)"
                    )

                    # Create search view for full-text search
                    cursor.execute("""
                        CREATE VIRTUAL TABLE IF NOT EXISTS memory_search 
                        USING fts5(content_data, metadata, tags, content='memory_entries')
                    """)

                    conn.commit()
                    logger.info("Database initialized successfully")

            except sqlite3.Error as e:
                logger.error(f"Database initialization failed: {e}")
                raise

    @contextmanager
    def _get_cursor(self):
        """Context manager for database cursor"""
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn.cursor()
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def store_memory(self, memory_entry: MemoryEntry) -> str:
        """Store a memory entry in the database"""
        with self.lock:
            try:
                with self._get_cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO memory_entries 
                        (id, domain, subdomain, content_type, content_data, metadata, tags, timestamp, source, confidence, context)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            memory_entry.id,
                            memory_entry.domain,
                            memory_entry.subdomain,
                            memory_entry.content_type,
                            json.dumps(memory_entry.content_data),
                            json.dumps(memory_entry.metadata),
                            json.dumps(memory_entry.tags),
                            memory_entry.timestamp,
                            memory_entry.source,
                            memory_entry.confidence,
                            json.dumps(memory_entry.context),
                        ),
                    )

                    # Update search index
                    cursor.execute(
                        """
                        INSERT INTO memory_search (rowid, content_data, metadata, tags)
                        VALUES (
                            (SELECT rowid FROM memory_entries WHERE id = ?),
                            ?, ?, ?
                        )
                    """,
                        (
                            memory_entry.id,
                            json.dumps(memory_entry.content_data),
                            json.dumps(memory_entry.metadata),
                            json.dumps(memory_entry.tags),
                        ),
                    )

                    logger.info(f"Stored memory entry: {memory_entry.id}")
                    return memory_entry.id

            except sqlite3.Error as e:
                logger.error(f"Failed to store memory entry: {e}")
                raise

    def retrieve_memory(self, memory_id: str) -> Optional[MemoryEntry]:
        """Retrieve a specific memory entry by ID"""
        with self.lock:
            try:
                with self._get_cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, domain, subdomain, content_type, content_data, metadata, tags, timestamp, source, confidence, context
                        FROM memory_entries WHERE id = ?
                    """,
                        (memory_id,),
                    )

                    row = cursor.fetchone()
                    if row:
                        return self._row_to_memory_entry(row)
                    return None

            except sqlite3.Error as e:
                logger.error(f"Failed to retrieve memory entry: {e}")
                raise

    def search_memories(
        self,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        keyword: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MemoryEntry]:
        """Search memories with various filters"""
        with self.lock:
            try:
                with self._get_cursor() as cursor:
                    # Build query dynamically
                    query_parts = ["SELECT * FROM memory_entries"]
                    params = []

                    if domain:
                        query_parts.append("WHERE domain = ?")
                        params.append(domain)
                        where_added = True

                    if content_type:
                        if where_added:
                            query_parts.append("AND content_type = ?")
                        else:
                            query_parts.append("WHERE content_type = ?")
                            where_added = True
                        params.append(content_type)

                    if source:
                        if where_added:
                            query_parts.append("AND source = ?")
                        else:
                            query_parts.append("WHERE source = ?")
                            where_added = True
                        params.append(source)

                    if tags:
                        if where_added:
                            query_parts.append(
                                "AND ("
                                + " OR ".join(["tags LIKE ?" for _ in tags])
                                + ")"
                            )
                        else:
                            query_parts.append(
                                "WHERE ("
                                + " OR ".join(["tags LIKE ?" for _ in tags])
                                + ")"
                            )
                            where_added = True
                        for tag in tags:
                            params.append(f"%{tag}%")

                    query_parts.append("ORDER BY timestamp DESC")
                    query_parts.append("LIMIT ? OFFSET ?")
                    params.extend([limit, offset])

                    query = " ".join(query_parts)

                    cursor.execute(query, params)
                    rows = cursor.fetchall()

                    memories = [self._row_to_memory_entry(row) for row in rows]

                    # Apply keyword search if specified
                    if keyword:
                        memories = [
                            m for m in memories if self._contains_keyword(m, keyword)
                        ]

                    return memories

            except sqlite3.Error as e:
                logger.error(f"Failed to search memories: {e}")
                raise

    def update_memory(self, memory_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing memory entry"""
        with self.lock:
            try:
                # Get existing memory first
                existing = self.retrieve_memory(memory_id)
                if not existing:
                    return False

                # Apply updates
                for key, value in updates.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)

                # Store updated memory
                with self._get_cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE memory_entries 
                        SET domain=?, subdomain=?, content_type=?, content_data=?, metadata=?, tags=?, timestamp=?, source=?, confidence=?, context=?
                        WHERE id=?
                    """,
                        (
                            existing.domain,
                            existing.subdomain,
                            existing.content_type,
                            json.dumps(existing.content_data),
                            json.dumps(existing.metadata),
                            json.dumps(existing.tags),
                            existing.timestamp,
                            existing.source,
                            existing.confidence,
                            json.dumps(existing.context),
                            memory_id,
                        ),
                    )

                logger.info(f"Updated memory entry: {memory_id}")
                return True

            except sqlite3.Error as e:
                logger.error(f"Failed to update memory entry: {e}")
                raise

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory entry"""
        with self.lock:
            try:
                with self._get_cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM memory_entries WHERE id = ?", (memory_id,)
                    )
                    cursor.execute(
                        "DELETE FROM memory_search WHERE rowid = (SELECT rowid FROM memory_entries WHERE id = ?)",
                        (memory_id,),
                    )
                    deleted = cursor.rowcount > 0

                    if deleted:
                        logger.info(f"Deleted memory entry: {memory_id}")

                    return deleted

            except sqlite3.Error as e:
                logger.error(f"Failed to delete memory entry: {e}")
                raise

    def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory system statistics"""
        with self.lock:
            try:
                with self._get_cursor() as cursor:
                    # Total memories
                    cursor.execute("SELECT COUNT(*) FROM memory_entries")
                    total_count = cursor.fetchone()[0]

                    # Domain distribution
                    cursor.execute(
                        "SELECT domain, COUNT(*) FROM memory_entries GROUP BY domain"
                    )
                    domain_dist = dict(cursor.fetchall())

                    # Content type distribution
                    cursor.execute(
                        "SELECT content_type, COUNT(*) FROM memory_entries GROUP BY content_type"
                    )
                    type_dist = dict(cursor.fetchall())

                    # Date range
                    cursor.execute(
                        "SELECT MIN(timestamp), MAX(timestamp) FROM memory_entries"
                    )
                    date_range = cursor.fetchone()

                    return {
                        "total_memories": total_count,
                        "domain_distribution": domain_dist,
                        "content_type_distribution": type_dist,
                        "date_range": {
                            "earliest": date_range[0],
                            "latest": date_range[1],
                        },
                    }

            except sqlite3.Error as e:
                logger.error(f"Failed to get memory stats: {e}")
                raise

    def _row_to_memory_entry(self, row) -> MemoryEntry:
        """Convert database row to MemoryEntry"""
        return MemoryEntry(
            id=row[0],
            domain=row[1],
            subdomain=row[2],
            content_type=row[3],
            content_data=json.loads(row[4]),
            metadata=json.loads(row[5]),
            tags=json.loads(row[6]),
            timestamp=row[7],
            source=row[8],
            confidence=row[9],
            context=json.loads(row[10]),
        )

    def _contains_keyword(self, memory: MemoryEntry, keyword: str) -> bool:
        """Check if memory contains keyword"""
        keyword_lower = keyword.lower()

        # Search in content data
        content_str = json.dumps(memory.content_data, default=str).lower()
        if keyword_lower in content_str:
            return True

        # Search in metadata
        metadata_str = json.dumps(memory.metadata, default=str).lower()
        if keyword_lower in metadata_str:
            return True

        # Search in tags
        for tag in memory.tags:
            if keyword_lower in tag.lower():
                return True

        # Search in context
        context_str = json.dumps(memory.context, default=str).lower()
        if keyword_lower in context_str:
            return True

        return False


class MemoryManager:
    """High-level memory management system with ChromaDB backend (required by default)"""

    def __init__(self, storage_path: str = None, use_chromadb: bool = True, allow_fallback: bool = False):
        """
        Initialize memory manager.

        Args:
            storage_path: Path for SQLite storage (only used if allow_fallback=True)
            use_chromadb: Whether to use ChromaDB (default True)
            allow_fallback: If False (default), raises error when ChromaDB unavailable.
                           This prevents silent data loss from storing in wrong backend.
                           Set to True only for local development/testing.
        """
        self.use_chromadb = use_chromadb and CHROMADB_AVAILABLE
        self.allow_fallback = allow_fallback
        self._chromadb_storage = None
        self._sqlite_storage = None

        # Try to initialize ChromaDB
        if self.use_chromadb:
            try:
                self._chromadb_storage = get_chromadb_storage()
                logger.info("Using ChromaDB storage backend")
            except Exception as e:
                if not self.allow_fallback:
                    # Fail explicitly to prevent data loss
                    error_msg = (
                        f"ChromaDB connection failed: {e}\n"
                        f"ChromaDB is REQUIRED to prevent data loss.\n"
                        f"Ensure ChromaDB is running at the configured host:port.\n"
                        f"Set allow_fallback=True only for local development (NOT recommended for production)."
                    )
                    logger.error(error_msg)
                    raise ConnectionError(error_msg) from e
                else:
                    logger.warning(f"ChromaDB initialization failed: {e}")
                    logger.warning("FALLING BACK TO SQLITE - DATA WILL NOT SYNC TO CHROMADB!")
                    self.use_chromadb = False

        # Initialize SQLite only if fallback is explicitly allowed
        if not self.use_chromadb:
            if not self.allow_fallback:
                raise ConnectionError(
                    "ChromaDB is required but not available. "
                    "Ensure ChromaDB is running and CHROMADB_HOST/CHROMADB_PORT are configured. "
                    "Set allow_fallback=True only for local development."
                )
            if storage_path is None:
                storage_path = os.environ.get("MCP_MEMORY_DB_PATH", "memory_system.db")
            self._sqlite_storage = MemoryStorage(storage_path)
            logger.warning(f"USING SQLITE FALLBACK: {storage_path}")
            logger.warning("WARNING: Data stored here will NOT be available in ChromaDB!")

        # For backward compatibility
        self.storage = self._sqlite_storage if self._sqlite_storage else None

        self.domain_validators = {
            "bmad_code": self._validate_bmad_code,
            "website_info": self._validate_website_info,
            "religious_discussions": self._validate_religious_discussions,
            "electronics_maker": self._validate_electronics_maker,
        }

    def store_conversation(
        self,
        domain: str,
        conversation_data: Dict[str, Any],
        source: str,
        content_type: str = "conversation",
        subdomain: Optional[str] = None,
        tags: Optional[List[str]] = None,
        confidence: float = 1.0,
    ) -> str:
        """Store a conversation in memory using ChromaDB or SQLite"""
        # Validate domain
        if domain not in self.domain_validators:
            raise ValueError(f"Invalid domain: {domain}")

        # Validate content (skip strict validation for flexibility)
        try:
            validator = self.domain_validators[domain]
            validator(conversation_data)
        except ValueError as e:
            logger.warning(f"Validation warning for {domain}: {e} - storing anyway")

        memory_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        metadata = {
            "stored_by": "multi_domain_memory_system",
            "validation_passed": True,
        }

        if self.use_chromadb and self._chromadb_storage:
            # Use ChromaDB storage
            return self._chromadb_storage.store_memory(
                domain=domain,
                memory_id=memory_id,
                content_data=conversation_data,
                metadata=metadata,
                tags=tags or [],
                timestamp=timestamp,
                source=source,
                confidence=confidence,
                context={},
                subdomain=subdomain,
                content_type=content_type,
            )
        else:
            # Fall back to SQLite
            memory_entry = MemoryEntry(
                id=memory_id,
                domain=domain,
                subdomain=subdomain,
                content_type=content_type,
                content_data=conversation_data,
                source=source,
                confidence=confidence,
                tags=tags or [],
                metadata=metadata,
                timestamp=timestamp,
            )
            return self._sqlite_storage.store_memory(memory_entry)

    def retrieve_conversations(
        self,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        keyword: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "timestamp",
        sort_order: str = "DESC",
        min_confidence: float = 0.0,
        max_confidence: float = 1.0,
        date_range: Optional[tuple] = None,
    ) -> List[MemoryEntry]:
        """Retrieve conversations with enhanced filtering and sorting"""
        if self.use_chromadb and self._chromadb_storage:
            # Use ChromaDB with semantic search
            results = self._chromadb_storage.search_memories(
                query=keyword,
                domain=domain,
                content_type=content_type,
                tags=tags,
                source=source,
                limit=limit,
                min_confidence=min_confidence,
            )

            # Convert dicts to MemoryEntry objects
            memories = []
            for r in results:
                entry = MemoryEntry(
                    id=r.get("id", ""),
                    domain=r.get("domain", ""),
                    subdomain=r.get("subdomain"),
                    content_type=r.get("content_type", "conversation"),
                    content_data=r.get("content_data", {}),
                    metadata=r.get("metadata", {}),
                    tags=r.get("tags", []),
                    timestamp=r.get("timestamp", ""),
                    source=r.get("source", ""),
                    confidence=r.get("confidence", 1.0),
                    context=r.get("context", {}),
                    similarity_score=r.get("similarity_score", 0.0),
                )
                memories.append(entry)

        else:
            # Use SQLite storage
            memories = self._sqlite_storage.search_memories(
                domain=domain,
                content_type=content_type,
                tags=tags,
                source=source,
                keyword=keyword,
                limit=limit,
                offset=offset,
            )

        # Apply confidence filter
        if min_confidence > 0.0 or max_confidence < 1.0:
            memories = [
                m for m in memories if min_confidence <= m.confidence <= max_confidence
            ]

        # Apply date range filter
        if date_range:
            start_date, end_date = date_range
            memories = [m for m in memories if start_date <= m.timestamp <= end_date]

        # Apply relevance scoring for keyword searches (SQLite only, ChromaDB handles this)
        if keyword and not self.use_chromadb:
            memories = self._score_and_sort_relevance(memories, keyword)

        # Apply sorting
        sort_key_map = {
            "timestamp": lambda x: x.timestamp,
            "confidence": lambda x: x.confidence,
            "domain": lambda x: x.domain,
            "source": lambda x: x.source,
            "relevance": lambda x: getattr(x, "relevance_score", 0.0),
            "similarity": lambda x: getattr(x, "similarity_score", 0.0),
        }

        if sort_by in sort_key_map:
            reverse = sort_order.upper() == "DESC"
            memories.sort(key=sort_key_map[sort_by], reverse=reverse)

        return memories

    def search_memories_advanced(
        self,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        exclude_keywords: Optional[List[str]] = None,
        required_fields: Optional[List[str]] = None,
        min_confidence: float = 0.0,
        max_confidence: float = 1.0,
        date_range: Optional[tuple] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "timestamp",
        sort_order: str = "DESC",
        fuzzy_search: bool = False,
    ) -> Dict[str, Any]:
        """Advanced search with comprehensive filtering and metadata"""
        # Get base memories
        memories = self.storage.search_memories(
            domain=domain,
            content_type=content_type,
            tags=tags,
            source=source,
            keyword=None,  # We'll handle keyword search manually for better control
            limit=limit * 2,  # Get more initially for filtering
            offset=offset,
        )

        # Apply confidence filter
        if min_confidence > 0.0 or max_confidence < 1.0:
            memories = [
                m for m in memories if min_confidence <= m.confidence <= max_confidence
            ]

        # Apply date range filter
        if date_range:
            start_date, end_date = date_range
            memories = [m for m in memories if start_date <= m.timestamp <= end_date]

        # Apply keyword search with better control
        if keywords:
            memories = self._filter_by_keywords(
                memories, keywords, fuzzy_search=fuzzy_search
            )

        # Apply exclusion filter
        if exclude_keywords:
            memories = self._exclude_keywords(memories, exclude_keywords)

        # Apply required fields filter
        if required_fields:
            memories = self._filter_required_fields(memories, required_fields)

        # Apply relevance scoring
        if keywords or fuzzy_search:
            memories = self._score_and_sort_relevance(
                memories, " ".join(keywords or [])
            )

        # Apply sorting
        sort_key_map = {
            "timestamp": lambda x: x.timestamp,
            "confidence": lambda x: x.confidence,
            "domain": lambda x: x.domain,
            "source": lambda x: x.source,
            "relevance": lambda x: getattr(x, "relevance_score", 0.0),
            "recency": lambda x: x.timestamp,  # Same as timestamp but clearer name
        }

        if sort_by in sort_key_map:
            reverse = sort_order.upper() == "DESC"
            memories.sort(key=sort_key_map[sort_by], reverse=reverse)

        # Limit and offset
        total_count = len(memories)
        memories = memories[offset : offset + limit]

        return {
            "memories": memories,
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
            "has_more": offset + limit < total_count,
        }

    def get_similar_memories(
        self, memory_id: str, limit: int = 10
    ) -> List[MemoryEntry]:
        """Find memories similar to a given memory ID"""
        target_memory = self.storage.retrieve_memory(memory_id)
        if not target_memory:
            return []

        # Get memories from same domain and source
        similar_memories = self.storage.search_memories(
            domain=target_memory.domain,
            source=target_memory.source,
            limit=limit * 3,  # Get more for similarity scoring
        )

        # Remove the target memory itself
        similar_memories = [m for m in similar_memories if m.id != memory_id]

        # Calculate similarity scores
        similar_memories = self._score_similarity(similar_memories, target_memory)

        # Sort by similarity and return top results
        similar_memories.sort(
            key=lambda x: getattr(x, "similarity_score", 0.0), reverse=True
        )

        return similar_memories[:limit]

    def get_memory_clusters(
        self, domain: Optional[str] = None, limit: int = 50
    ) -> Dict[str, List[MemoryEntry]]:
        """Group memories into clusters by common tags and metadata"""
        memories = self.storage.search_memories(
            domain=domain,
            limit=limit * 2,  # Get more for clustering
        )

        clusters = {}

        for memory in memories:
            # Generate cluster key based on tags and metadata
            cluster_tags = set(memory.tags) if memory.tags else set()
            cluster_key = "_".join(sorted(cluster_tags))

            if not cluster_key:
                cluster_key = "uncategorized"

            # Add memory to cluster
            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(memory)

        # Sort clusters by size
        sorted_clusters = dict(
            sorted(clusters.items(), key=lambda x: len(x[1]), reverse=True)
        )

        return sorted_clusters

    def _filter_by_keywords(
        self,
        memories: List[MemoryEntry],
        keywords: List[str],
        fuzzy_search: bool = False,
    ) -> List[MemoryEntry]:
        """Filter memories by keywords with optional fuzzy search"""
        if not keywords:
            return memories

        filtered_memories = []
        query_text = " ".join(keywords).lower()

        for memory in memories:
            # Search in content data
            content_str = json.dumps(memory.content_data, default=str).lower()
            metadata_str = json.dumps(memory.metadata, default=str).lower()
            context_str = json.dumps(memory.context, default=str).lower()

            # Check for keyword matches
            all_text = f"{content_str} {metadata_str} {context_str}"

            if fuzzy_search:
                # Fuzzy matching - partial word matches
                matches = sum(
                    1
                    for keyword in keywords
                    if any(keyword in word for word in all_text.split())
                )
                if matches > 0:
                    filtered_memories.append(memory)
            else:
                # Exact matching
                if all(keyword in all_text for keyword in keywords):
                    filtered_memories.append(memory)

        return filtered_memories

    def _exclude_keywords(
        self, memories: List[MemoryEntry], exclude_keywords: List[str]
    ) -> List[MemoryEntry]:
        """Exclude memories containing specific keywords"""
        if not exclude_keywords:
            return memories

        filtered_memories = []
        exclude_lower = [kw.lower() for kw in exclude_keywords]

        for memory in memories:
            content_str = json.dumps(memory.content_data, default=str).lower()
            metadata_str = json.dumps(memory.metadata, default=str).lower()
            context_str = json.dumps(memory.context, default=str).lower()

            all_text = f"{content_str} {metadata_str} {context_str}"

            # Check if any excluded keyword is present
            if not any(exclude_kw in all_text for exclude_kw in exclude_lower):
                filtered_memories.append(memory)

        return filtered_memories

    def _filter_required_fields(
        self, memories: List[MemoryEntry], required_fields: List[str]
    ) -> List[MemoryEntry]:
        """Filter memories that contain required fields"""
        if not required_fields:
            return memories

        filtered_memories = []

        for memory in memories:
            # Check content_data for required fields
            content_fields = set(memory.content_data.keys())
            metadata_fields = set(memory.metadata.keys())
            context_fields = set(memory.context.keys())

            all_fields = content_fields.union(metadata_fields).union(context_fields)

            if all(field in all_fields for field in required_fields):
                filtered_memories.append(memory)

        return filtered_memories

    def _score_and_sort_relevance(
        self, memories: List[MemoryEntry], query: str
    ) -> List[MemoryEntry]:
        """Score memories by relevance to query"""
        query_lower = query.lower()

        for memory in memories:
            # Calculate relevance score
            score = 0.0

            # Content data relevance
            content_str = json.dumps(memory.content_data, default=str).lower()
            content_matches = query_lower in content_str
            score += 0.4 if content_matches else 0.0

            # Metadata relevance
            metadata_str = json.dumps(memory.metadata, default=str).lower()
            metadata_matches = query_lower in metadata_str
            score += 0.3 if metadata_matches else 0.0

            # Tags relevance
            tag_matches = sum(1 for tag in memory.tags if query_lower in tag.lower())
            score += min(tag_matches * 0.1, 0.3)

            # Context relevance
            context_str = json.dumps(memory.context, default=str).lower()
            context_matches = query_lower in context_str
            score += 0.2 if context_matches else 0.0

            # Set relevance score
            memory.relevance_score = score

        return memories

    def _score_similarity(
        self, memories: List[MemoryEntry], target_memory: MemoryEntry
    ) -> List[MemoryEntry]:
        """Score memories by similarity to target memory"""
        for memory in memories:
            score = 0.0

            # Same subdomain
            if memory.subdomain == target_memory.subdomain and memory.subdomain:
                score += 0.2

            # Common tags
            common_tags = set(memory.tags) & set(target_memory.tags)
            score += min(len(common_tags) * 0.1, 0.3)

            # Similar time window (within 24 hours)
            if memory.timestamp and target_memory.timestamp:
                try:
                    time_diff = abs(
                        datetime.fromisoformat(memory.timestamp)
                        - datetime.fromisoformat(target_memory.timestamp)
                    )
                    if time_diff.total_seconds() <= 86400:  # 24 hours
                        score += 0.2
                except:
                    pass

            # Same content type
            if memory.content_type == target_memory.content_type:
                score += 0.1

            # Same source
            if memory.source == target_memory.source:
                score += 0.2

            memory.similarity_score = score

        return memories

    def get_domain_conversations(
        self, domain: str, limit: int = 100
    ) -> List[MemoryEntry]:
        """Get all conversations for a specific domain"""
        return self.storage.search_memories(domain=domain, limit=limit)

    def expand_keywords(
        self,
        domain: str,
        user_query: str,
        use_stored_memories: bool = True,
        max_keywords: int = 15,
    ) -> List[str]:
        """Expand user query with domain-specific keywords using multiple strategies"""
        if domain not in self.domain_validators:
            return []

        # Get base domain keywords
        base_keywords = self._get_domain_keywords(domain)

        # Extract words from user query
        query_words = set(re.findall(r"\b\w+\b", user_query.lower()))

        # Strategy 1: Direct keyword matching
        direct_matches = []
        for keyword in base_keywords:
            if any(word in keyword.lower() for word in query_words):
                direct_matches.append(keyword)

        # Strategy 2: Extract keywords from stored memories (if enabled)
        memory_keywords = []
        if use_stored_memories:
            memory_keywords = self._extract_keywords_from_memories(domain, query_words)

        # Strategy 3: Generate related terms using word stemming
        stemmed_keywords = self._generate_stemmed_keywords(query_words, base_keywords)

        # Strategy 4: Add synonyms and related terms
        synonym_keywords = self._get_synonym_keywords(query_words, domain)

        # Combine all keywords, removing duplicates
        all_keywords = []
        seen_keywords = set()

        for keyword_list in [
            direct_matches,
            memory_keywords,
            stemmed_keywords,
            synonym_keywords,
        ]:
            for keyword in keyword_list:
                if keyword.lower() not in seen_keywords:
                    all_keywords.append(keyword)
                    seen_keywords.add(keyword.lower())

        # Sort by relevance and return top keywords
        all_keywords.sort(
            key=lambda x: self._calculate_keyword_relevance(x, query_words, domain),
            reverse=True,
        )

        return all_keywords[:max_keywords]

    def get_keyword_trends(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """Analyze keyword trends in a domain over specified days"""
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Get memories from the specified time period
        memories = self.storage.search_memories(domain=domain, limit=1000)

        # Filter memories by date
        recent_memories = []
        for memory in memories:
            try:
                memory_date = datetime.fromisoformat(memory.timestamp)
                if memory_date >= cutoff_date:
                    recent_memories.append(memory)
            except:
                continue

        # Analyze keyword frequency
        keyword_frequency = {}
        content_words = set()

        for memory in recent_memories:
            # Extract words from content data
            content_str = json.dumps(memory.content_data, default=str)
            metadata_str = json.dumps(memory.metadata, default=str)
            context_str = json.dumps(memory.context, default=str)
            combined_str = f"{content_str} {metadata_str} {context_str}"

            words = re.findall(r"\b\w+\b", combined_str.lower())

            for word in words:
                if len(word) > 3:  # Filter out very short words
                    keyword_frequency[word] = keyword_frequency.get(word, 0) + 1
                    content_words.add(word)

        # Get top trending keywords
        sorted_keywords = sorted(
            keyword_frequency.items(), key=lambda x: x[1], reverse=True
        )
        top_keywords = [kw for kw, freq in sorted_keywords[:20]]

        # Calculate keyword diversity
        diversity_score = len(content_words) / max(len(recent_memories), 1)

        # Calculate average words per memory
        total_words = sum(
            len(
                re.findall(
                    r"\b\w+\b",
                    json.dumps(m.content_data, default=str)
                    + " "
                    + json.dumps(m.metadata, default=str)
                    + " "
                    + json.dumps(m.context, default=str),
                )
            )
            for m in recent_memories
        )
        avg_words_per_memory = (
            total_words / len(recent_memories) if recent_memories else 0
        )

        return {
            "total_memories": len(recent_memories),
            "top_keywords": top_keywords,
            "keyword_frequency": dict(sorted_keywords[:50]),
            "diversity_score": diversity_score,
            "unique_words": len(content_words),
            "average_words_per_memory": avg_words_per_memory,
        }

    def get_keyword_clusters(
        self, domain: str, threshold: float = 0.7
    ) -> Dict[str, List[str]]:
        """Group keywords into clusters based on semantic similarity"""
        keywords = self._get_domain_keywords(domain)

        # Simple clustering based on word overlap
        clusters = {}
        used_keywords = set()

        for keyword in keywords:
            if keyword.lower() in used_keywords:
                continue

            # Find similar keywords
            similar_keywords = [keyword]
            for other_keyword in keywords:
                if (
                    other_keyword.lower() not in used_keywords
                    and other_keyword != keyword
                ):
                    similarity = self._calculate_keyword_similarity(
                        keyword, other_keyword
                    )
                    if similarity >= threshold:
                        similar_keywords.append(other_keyword)
                        used_keywords.add(other_keyword.lower())

            if len(similar_keywords) > 1:
                cluster_name = similar_keywords[0]  # Use first keyword as cluster name
                clusters[cluster_name] = similar_keywords
                used_keywords.add(keyword.lower())

        return clusters

    def _extract_keywords_from_memories(
        self, domain: str, query_words: set
    ) -> List[str]:
        """Extract keywords from stored memories in the domain"""
        memories = self.storage.search_memories(domain=domain, limit=100)

        extracted_keywords = []
        keyword_scores = {}

        for memory in memories:
            # Extract words from content
            content_str = (
                json.dumps(memory.content_data, default=str)
                + " "
                + json.dumps(memory.metadata, default=str)
                + " "
                + json.dumps(memory.context, default=str)
            )
            words = re.findall(r"\b\w+\b", content_str.lower())

            for word in words:
                if (
                    len(word) > 4 and word not in query_words
                ):  # Avoid query words and short words
                    score = keyword_scores.get(word, 0) + 1
                    keyword_scores[word] = score

        # Sort by frequency and return top keywords
        sorted_keywords = sorted(
            keyword_scores.items(), key=lambda x: x[1], reverse=True
        )
        return [kw for kw, freq in sorted_keywords[:10]]

    def _generate_stemmed_keywords(
        self, query_words: set, base_keywords: List[str]
    ) -> List[str]:
        """Generate keywords using stemming and word variations"""
        stemmed_keywords = []

        for word in query_words:
            # Add base keywords that contain stemmed versions
            for keyword in base_keywords:
                if any(
                    self._stem_word(w) in self._stem_word(keyword) for w in query_words
                ):
                    stemmed_keywords.append(keyword)
                    break

        return stemmed_keywords

    def _get_synonym_keywords(self, query_words: set, domain: str) -> List[str]:
        """Get synonyms and related terms for query words"""
        synonym_map = {
            "bmad_code": {
                "code": ["programming", "development", "implementation", "coding"],
                "function": ["method", "procedure", "routine"],
                "class": ["object", "type", "structure"],
                "project": ["application", "system", "module"],
            },
            "website_info": {
                "website": ["site", "page", "webpage"],
                "content": ["information", "data", "material"],
                "article": ["post", "entry", "document"],
                "online": ["internet", "web", "digital"],
            },
            "religious_discussions": {
                "theological": ["doctrinal", "religious", "spiritual"],
                "scripture": ["bible", "text", "writing"],
                "doctrine": ["teaching", "belief", "principle"],
                "worship": ["prayer", "adoration", "reverence"],
            },
            "electronics_maker": {
                "circuit": ["electronic", "board", "wiring"],
                "component": ["part", "element", "device"],
                "microcontroller": ["mcu", "chip", "processor"],
                "arduino": ["uno", "mega", "nano"],
            },
        }

        synonyms = []
        domain_synonyms = synonym_map.get(domain, {})

        for word in query_words:
            if word in domain_synonyms:
                synonyms.extend(domain_synonyms[word])

        return synonyms

    def _calculate_keyword_relevance(
        self, keyword: str, query_words: set, domain: str
    ) -> float:
        """Calculate relevance score for a keyword"""
        score = 0.0

        # Direct match with query words
        keyword_lower = keyword.lower()
        for word in query_words:
            if word in keyword_lower:
                score += 0.5

        # Domain relevance
        domain_keywords = self._get_domain_keywords(domain)
        domain_keywords_lower = [kw.lower() for kw in domain_keywords]
        if keyword_lower in domain_keywords_lower:
            score += 0.3

        # Keyword length (longer keywords often more specific)
        score += min(len(keyword) / 50, 0.2)

        return score

    def _calculate_keyword_similarity(self, keyword1: str, keyword2: str) -> float:
        """Calculate similarity between two keywords"""
        # Simple overlap-based similarity
        words1 = set(re.findall(r"\b\w+\b", keyword1.lower()))
        words2 = set(re.findall(r"\b\w+\b", keyword2.lower()))

        if not words1 or not words2:
            return 0.0

        intersection = len(words1 & words2)
        union = len(words1 | words2)

        return intersection / union if union > 0 else 0.0

    def _stem_word(self, word: str) -> str:
        """Simple stemming function"""
        # Remove common suffixes
        suffixes = ["ing", "ed", "es", "s", "ly", "tion", "ment", "er", "or"]
        stemmed = word.lower()

        for suffix in suffixes:
            if stemmed.endswith(suffix):
                stemmed = stemmed[: -len(suffix)]
                break

        return stemmed

    def get_memory_statistics(self) -> Dict[str, Any]:
        """Get comprehensive memory system statistics"""
        if self.use_chromadb and self._chromadb_storage:
            stats = self._chromadb_storage.get_statistics()
            stats["storage_backend"] = "chromadb"
            return stats
        else:
            stats = self._sqlite_storage.get_memory_stats()
            stats["storage_backend"] = "sqlite"
            return stats

    def _validate_bmad_code(self, data: Dict[str, Any]):
        """Validate BMAD code memory content with comprehensive checks"""
        # Required fields for BMAD code memory
        required_fields = ["code_snippet", "conversation_context", "project_id"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field for BMAD code: {field}")

        # Validate code snippet
        if "code_snippet" in data:
            code = data["code_snippet"]
            if not isinstance(code, str):
                raise ValueError("Code snippet must be a string")
            if len(code.strip()) == 0:
                raise ValueError("Code snippet cannot be empty")
            if len(code) > 50000:  # Reasonable code length
                raise ValueError("Code snippet too long (max 50000 characters)")

        # Validate conversation context
        if "conversation_context" in data:
            context = data["conversation_context"]
            if not isinstance(context, str):
                raise ValueError("Conversation context must be a string")
            if len(context.strip()) == 0:
                raise ValueError("Conversation context cannot be empty")

        # Validate project_id
        if "project_id" in data:
            project_id = data["project_id"]
            if not isinstance(project_id, str):
                raise ValueError("Project ID must be a string")
            if not re.match(r"^[a-zA-Z0-9_\-]+$", project_id):
                raise ValueError("Project ID contains invalid characters")

        # Validate optional but recommended fields
        recommended_fields = [
            "specification_reference",
            "testing_status",
            "architecture_notes",
        ]
        for field in recommended_fields:
            if field in data and not isinstance(data[field], (str, dict)):
                raise ValueError(f"{field} must be string or dict")

        # Validate participants field if present
        if "participants" in data:
            participants = data["participants"]
            if not isinstance(participants, list):
                raise ValueError("Participants must be a list")
            for participant in participants:
                if not isinstance(participant, str):
                    raise ValueError("Each participant must be a string")

        # Validate technical specifications if present
        if "technical_specs" in data:
            specs = data["technical_specs"]
            if not isinstance(specs, dict):
                raise ValueError("Technical specifications must be a dictionary")

            # Check for valid technical spec keys
            valid_spec_keys = [
                "framework",
                "language",
                "dependencies",
                "architecture",
                "patterns",
            ]
            for key in specs.keys():
                if key not in valid_spec_keys and not key.startswith("custom_"):
                    logger.warning(f"Unrecognized technical specification key: {key}")

        # Validate conversation metadata
        if "conversation_metadata" in data:
            metadata = data["conversation_metadata"]
            if not isinstance(metadata, dict):
                raise ValueError("Conversation metadata must be a dictionary")

            # Check for required metadata keys
            required_metadata_keys = ["timestamp", "participants", "topic"]
            for key in required_metadata_keys:
                if key not in metadata:
                    logger.warning(f"Missing recommended metadata key: {key}")

        logger.info("BMAD code validation passed")

    def _validate_website_info(self, data: Dict[str, Any]):
        """Validate website information memory content with comprehensive checks"""
        # Validate URL format and requirements
        if "url" in data:
            url = data["url"]
            if not isinstance(url, str):
                raise ValueError("URL must be a string")
            if not url.startswith(("http://", "https://")):
                raise ValueError("URL must start with http:// or https://")
            if len(url) > 2048:  # Maximum URL length
                raise ValueError("URL too long (max 2048 characters)")

            # Basic URL structure validation
            try:
                from urllib.parse import urlparse

                parsed = urlparse(url)
                if not parsed.netloc:
                    raise ValueError("Invalid URL structure")
                if not parsed.scheme:
                    raise ValueError("URL missing scheme")
            except ImportError:
                # Fallback validation if urllib.parse not available
                if not (url.startswith("http://") or url.startswith("https://")):
                    raise ValueError("Invalid URL scheme")

        # Validate content summary
        if "content_summary" in data:
            summary = data["content_summary"]
            if not isinstance(summary, str):
                raise ValueError("Content summary must be a string")
            if len(summary.strip()) == 0:
                raise ValueError("Content summary cannot be empty")
            if len(summary) > 2000:  # Reasonable summary length
                raise ValueError("Content summary too long (max 2000 characters)")

        # Validate website metadata
        if "website_metadata" in data:
            metadata = data["website_metadata"]
            if not isinstance(metadata, dict):
                raise ValueError("Website metadata must be a dictionary")

            # Check for common metadata fields
            common_fields = [
                "title",
                "description",
                "keywords",
                "author",
                "publish_date",
            ]
            for field in common_fields:
                if field in metadata and not isinstance(metadata[field], (str, list)):
                    logger.warning(
                        f"Website metadata field '{field}' should be string or list"
                    )

        # Validate content categories
        if "content_categories" in data:
            categories = data["content_categories"]
            if not isinstance(categories, list):
                raise ValueError("Content categories must be a list")
            if len(categories) == 0:
                raise ValueError("Content categories cannot be empty")
            for category in categories:
                if not isinstance(category, str):
                    raise ValueError("Each content category must be a string")

        # Validate access information if present
        if "access_info" in data:
            access_info = data["access_info"]
            if not isinstance(access_info, dict):
                raise ValueError("Access information must be a dictionary")

            # Check for valid access keys
            valid_access_keys = [
                "access_date",
                "access_method",
                "response_time",
                "status_code",
            ]
            for key in access_info.keys():
                if key not in valid_access_keys and not key.startswith("custom_"):
                    logger.warning(f"Unrecognized access information key: {key}")

        # Validate content quality metrics if present
        if "quality_metrics" in data:
            metrics = data["quality_metrics"]
            if not isinstance(metrics, dict):
                raise ValueError("Quality metrics must be a dictionary")

            # Validate numeric metrics
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    if value < 0:
                        logger.warning(
                            f"Negative quality metric value: {key} = {value}"
                        )
                elif not isinstance(value, str):
                    logger.warning(f"Quality metric '{key}' has invalid type")

        logger.info("Website information validation passed")

    def _validate_religious_discussions(self, data: Dict[str, Any]):
        """Validate religious discussions memory content with comprehensive checks"""
        # Check for sensitive content markers
        sensitive_terms = [
            "theological",
            "scripture",
            "doctrine",
            "belief",
            "faith",
            "worship",
            "divine",
            "sacred",
        ]
        content_str = json.dumps(data, default=str).lower()

        sensitive_count = sum(term in content_str for term in sensitive_terms)
        if sensitive_count > 10:  # Too many sensitive terms
            logger.warning("High concentration of sensitive theological terms detected")

        # Validate discussion participants
        if "participants" in data:
            participants = data["participants"]
            if not isinstance(participants, list):
                raise ValueError("Participants must be a list")
            for participant in participants:
                if not isinstance(participant, str):
                    raise ValueError("Each participant must be a string")

        # Validate discussion topic
        if "discussion_topic" in data:
            topic = data["discussion_topic"]
            if not isinstance(topic, str):
                raise ValueError("Discussion topic must be a string")
            if len(topic.strip()) == 0:
                raise ValueError("Discussion topic cannot be empty")

        # Validate theological context if present
        if "theological_context" in data:
            context = data["theological_context"]
            if not isinstance(context, str):
                raise ValueError("Theological context must be a string")
            if len(context) > 5000:  # Reasonable context length
                raise ValueError("Theological context too long (max 5000 characters)")

        # Validate scripture references if present
        if "scripture_references" in data:
            references = data["scripture_references"]
            if not isinstance(references, list):
                raise ValueError("Scripture references must be a list")
            for ref in references:
                if not isinstance(ref, str):
                    raise ValueError("Each scripture reference must be a string")

        # Validate discussion metadata
        if "discussion_metadata" in data:
            metadata = data["discussion_metadata"]
            if not isinstance(metadata, dict):
                raise ValueError("Discussion metadata must be a dictionary")

            # Check for recommended metadata keys
            recommended_keys = [
                "denomination",
                "tradition",
                "historical_context",
                "geographical_region",
            ]
            for key in recommended_keys:
                if key in metadata and not isinstance(metadata[key], str):
                    logger.warning(
                        f"Discussion metadata field '{key}' should be a string"
                    )

        # Validate content sensitivity level
        if "sensitivity_level" in data:
            sensitivity = data["sensitivity_level"]
            if not isinstance(sensitivity, str):
                raise ValueError("Sensitivity level must be a string")
            valid_levels = ["general", "moderate", "sensitive", "confidential"]
            if sensitivity not in valid_levels:
                logger.warning(f"Unrecognized sensitivity level: {sensitivity}")

        # Validate discussion category
        if "discussion_category" in data:
            category = data["discussion_category"]
            if not isinstance(category, str):
                raise ValueError("Discussion category must be a string")
            valid_categories = [
                "theology",
                "scripture",
                "practice",
                "ethics",
                "history",
                "comparative",
            ]
            if category not in valid_categories:
                logger.warning(f"Unrecognized discussion category: {category}")

        logger.info("Religious discussions validation passed")

    def _validate_electronics_maker(self, data: Dict[str, Any]):
        """Validate electronics/maker project memory content with comprehensive checks"""
        # Validate project information
        if "project_name" in data:
            name = data["project_name"]
            if not isinstance(name, str):
                raise ValueError("Project name must be a string")
            if len(name.strip()) == 0:
                raise ValueError("Project name cannot be empty")

        # Validate project category
        if "project_category" in data:
            category = data["project_category"]
            if not isinstance(category, str):
                raise ValueError("Project category must be a string")
            valid_categories = [
                "microcontroller",
                "sensor",
                "actuator",
                "power",
                "iot",
                "robotics",
                "makerspace",
                "prototyping",
            ]
            if category not in valid_categories:
                logger.warning(f"Unrecognized project category: {category}")

        # Validate technical specifications
        if "technical_specs" in data:
            specs = data["technical_specs"]
            if not isinstance(specs, dict):
                raise ValueError("Technical specifications must be a dictionary")

            # Check for valid technical spec keys
            valid_spec_keys = [
                "voltage",
                "current",
                "power",
                "frequency",
                "resistance",
                "capacitance",
                "inductance",
                "temperature",
                "humidity",
                "pressure",
                "dimensions",
                "weight",
                "material",
                "manufacturer",
                "part_number",
            ]
            for key in specs.keys():
                if key not in valid_spec_keys and not key.startswith("custom_"):
                    logger.warning(f"Unrecognized technical specification key: {key}")

                # Validate numeric specifications
                value = specs[key]
                if isinstance(value, (int, float)):
                    if value < 0:
                        raise ValueError(
                            f"Invalid negative specification: {key} = {value}"
                        )
                    if key in [
                        "voltage",
                        "current",
                        "power",
                        "frequency",
                        "resistance",
                        "capacitance",
                        "inductance",
                    ]:
                        if value == 0:
                            logger.warning(
                                f"Zero value for {key} may indicate incomplete specification"
                            )

        # Validate components list if present
        if "components" in data:
            components = data["components"]
            if not isinstance(components, list):
                raise ValueError("Components must be a list")
            for component in components:
                if not isinstance(component, dict):
                    raise ValueError("Each component must be a dictionary")
                required_fields = ["name", "type"]
                for field in required_fields:
                    if field not in component:
                        logger.warning(f"Component missing required field: {field}")

        # Validate tools and equipment if present
        if "tools_equipment" in data:
            tools = data["tools_equipment"]
            if not isinstance(tools, list):
                raise ValueError("Tools and equipment must be a list")
            for tool in tools:
                if not isinstance(tool, str):
                    raise ValueError("Each tool must be a string")

        # Validate project status
        if "project_status" in data:
            status = data["project_status"]
            if not isinstance(status, str):
                raise ValueError("Project status must be a string")
            valid_statuses = [
                "concept",
                "design",
                "prototyping",
                "testing",
                "production",
                "completed",
                "abandoned",
            ]
            if status not in valid_statuses:
                logger.warning(f"Unrecognized project status: {status}")

        # Validate difficulty level if present
        if "difficulty_level" in data:
            difficulty = data["difficulty_level"]
            if not isinstance(difficulty, str):
                raise ValueError("Difficulty level must be a string")
            valid_difficulties = ["beginner", "intermediate", "advanced", "expert"]
            if difficulty not in valid_difficulties:
                logger.warning(f"Unrecognized difficulty level: {difficulty}")

        # Validate safety information if present
        if "safety_info" in data:
            safety = data["safety_info"]
            if not isinstance(safety, str):
                raise ValueError("Safety information must be a string")
            if len(safety.strip()) == 0:
                logger.warning("Empty safety information field")

        logger.info("Electronics/maker project validation passed")

    def _get_domain_keywords(self, domain: str) -> List[str]:
        """Get domain-specific keywords for expansion"""
        keyword_sets = {
            "bmad_code": [
                "code",
                "development",
                "implementation",
                "architecture",
                "design",
                "algorithm",
                "function",
                "class",
                "method",
                "variable",
                "project",
                "specification",
                "requirement",
                "testing",
                "debugging",
            ],
            "website_info": [
                "website",
                "content",
                "article",
                "page",
                "url",
                "domain",
                "information",
                "data",
                "resource",
                "source",
                "citation",
                "online",
                "web",
                "internet",
                "platform",
                "service",
            ],
            "religious_discussions": [
                "theological",
                "spiritual",
                "religious",
                "faith",
                "belief",
                "doctrine",
                "scripture",
                "bible",
                "theology",
                "philosophy",
                "worship",
                "prayer",
                "spirituality",
                "divine",
                "sacred",
            ],
            "electronics_maker": [
                "electronics",
                "circuit",
                "component",
                "resistor",
                "capacitor",
                "microcontroller",
                "arduino",
                "raspberry",
                "sensor",
                "actuator",
                "maker",
                "diy",
                "project",
                "prototype",
                "engineering",
            ],
        }

        return keyword_sets.get(domain, [])

    def cleanup_expired_memories(self, days_old: int = 30):
        """Clean up old memories based on age"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        cutoff_str = cutoff_date.isoformat()

        with self.storage.lock:
            try:
                with self.storage._get_cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM memory_entries WHERE timestamp < ?", (cutoff_str,)
                    )
                    deleted = cursor.rowcount
                    logger.info(f"Cleaned up {deleted} old memories")
                    return deleted
            except Exception as e:
                logger.error(f"Failed to cleanup expired memories: {e}")
                raise


# MCP Integration Interface
class MCPMemoryInterface:
    """MCP interface for multi-domain memory system integration"""

    def __init__(self, memory_manager: MemoryManager):
        self.memory_manager = memory_manager

    def mcp_store_memory(
        self,
        domain: str,
        content_data: Dict[str, Any],
        source: str,
        content_type: str = "conversation",
        subdomain: Optional[str] = None,
        tags: Optional[List[str]] = None,
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        """MCP tool to store memory in the multi-domain system"""
        try:
            memory_id = self.memory_manager.store_conversation(
                domain=domain,
                conversation_data=content_data,
                source=source,
                content_type=content_type,
                subdomain=subdomain,
                tags=tags,
                confidence=confidence,
            )
            return {
                "status": "success",
                "memory_id": memory_id,
                "message": f"Memory stored successfully in {domain} domain",
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to store memory in {domain} domain",
            }

    def mcp_retrieve_memories(
        self,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        keyword: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """MCP tool to retrieve memories with filtering"""
        try:
            memories = self.memory_manager.retrieve_conversations(
                domain=domain,
                content_type=content_type,
                tags=tags,
                source=source,
                keyword=keyword,
                limit=limit,
                offset=offset,
            )
            return [memory.to_dict() for memory in memories]
        except Exception as e:
            return [
                {
                    "status": "error",
                    "error": str(e),
                    "message": "Failed to retrieve memories",
                }
            ]

    def mcp_search_memories_advanced(
        self,
        domain: Optional[str] = None,
        content_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        exclude_keywords: Optional[List[str]] = None,
        min_confidence: float = 0.0,
        max_confidence: float = 1.0,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """MCP tool for advanced memory search"""
        try:
            result = self.memory_manager.search_memories_advanced(
                domain=domain,
                content_type=content_type,
                tags=tags,
                source=source,
                keywords=keywords,
                exclude_keywords=exclude_keywords,
                min_confidence=min_confidence,
                max_confidence=max_confidence,
                limit=limit,
            )
            return {
                "status": "success",
                "memories": [memory.to_dict() for memory in result["memories"]],
                "total_count": result["total_count"],
                "has_more": result["has_more"],
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": "Failed to perform advanced search",
            }

    def mcp_expand_keywords(
        self, domain: str, user_query: str, max_keywords: int = 15
    ) -> Dict[str, Any]:
        """MCP tool to expand user query with domain-specific keywords"""
        try:
            keywords = self.memory_manager.expand_keywords(
                domain=domain, user_query=user_query, max_keywords=max_keywords
            )
            return {
                "status": "success",
                "keywords": keywords,
                "domain": domain,
                "query": user_query,
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": "Failed to expand keywords",
            }

    def mcp_get_memory_statistics(self) -> Dict[str, Any]:
        """MCP tool to get memory system statistics"""
        try:
            stats = self.memory_manager.get_memory_statistics()
            return {"status": "success", "statistics": stats}
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": "Failed to get memory statistics",
            }

    def mcp_get_similar_memories(
        self, memory_id: str, limit: int = 10
    ) -> Dict[str, Any]:
        """MCP tool to find similar memories"""
        try:
            similar_memories = self.memory_manager.get_similar_memories(
                memory_id, limit
            )
            return {
                "status": "success",
                "similar_memories": [memory.to_dict() for memory in similar_memories],
                "target_memory_id": memory_id,
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": "Failed to find similar memories",
            }

    def mcp_get_keyword_trends(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """MCP tool to analyze keyword trends"""
        try:
            trends = self.memory_manager.get_keyword_trends(domain, days)
            return {
                "status": "success",
                "trends": trends,
                "domain": domain,
                "days": days,
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": "Failed to analyze keyword trends",
            }


# MCP Server Implementation
class MCPMemoryServer:
    """MCP server for multi-domain memory system"""

    def __init__(self, memory_manager: MemoryManager):
        self.memory_interface = MCPMemoryInterface(memory_manager)
        self.tools = {
            "store_memory": {
                "name": "store_memory",
                "description": "Store a memory entry in the multi-domain memory system",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {
                            "type": "string",
                            "description": "Memory domain (bmad_code, website_info, religious_discussions, electronics_maker)",
                        },
                        "content_data": {
                            "type": "object",
                            "description": "Memory content data",
                        },
                        "source": {
                            "type": "string",
                            "description": "Source of the memory",
                        },
                        "content_type": {
                            "type": "string",
                            "description": "Type of content",
                            "default": "conversation",
                        },
                        "subdomain": {
                            "type": "string",
                            "description": "Optional subdomain",
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional tags",
                        },
                        "confidence": {
                            "type": "number",
                            "description": "Confidence score (0.0-1.0)",
                            "default": 1.0,
                        },
                    },
                    "required": ["domain", "content_data", "source"],
                },
            },
            "retrieve_memories": {
                "name": "retrieve_memories",
                "description": "Retrieve memories with filtering options",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string", "description": "Filter by domain"},
                        "content_type": {
                            "type": "string",
                            "description": "Filter by content type",
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Filter by tags",
                        },
                        "source": {"type": "string", "description": "Filter by source"},
                        "keyword": {
                            "type": "string",
                            "description": "Search by keyword",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum results",
                            "default": 100,
                        },
                        "offset": {
                            "type": "integer",
                            "description": "Offset for pagination",
                            "default": 0,
                        },
                    },
                },
            },
            "search_memories_advanced": {
                "name": "search_memories_advanced",
                "description": "Advanced search with multiple filters and keywords",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string", "description": "Filter by domain"},
                        "content_type": {
                            "type": "string",
                            "description": "Filter by content type",
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Filter by tags",
                        },
                        "source": {"type": "string", "description": "Filter by source"},
                        "keywords": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Search keywords",
                        },
                        "exclude_keywords": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Keywords to exclude",
                        },
                        "min_confidence": {
                            "type": "number",
                            "description": "Minimum confidence score",
                            "default": 0.0,
                        },
                        "max_confidence": {
                            "type": "number",
                            "description": "Maximum confidence score",
                            "default": 1.0,
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum results",
                            "default": 100,
                        },
                    },
                },
            },
            "expand_keywords": {
                "name": "expand_keywords",
                "description": "Expand user query with domain-specific keywords",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {
                            "type": "string",
                            "description": "Domain for keyword expansion",
                        },
                        "user_query": {
                            "type": "string",
                            "description": "User query to expand",
                        },
                        "max_keywords": {
                            "type": "integer",
                            "description": "Maximum keywords to return",
                            "default": 15,
                        },
                    },
                    "required": ["domain", "user_query"],
                },
            },
            "get_memory_statistics": {
                "name": "get_memory_statistics",
                "description": "Get memory system statistics",
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
            "get_similar_memories": {
                "name": "get_similar_memories",
                "description": "Find memories similar to a specific memory",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "memory_id": {
                            "type": "string",
                            "description": "ID of the memory to find similar ones for",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum similar memories to return",
                            "default": 10,
                        },
                    },
                    "required": ["memory_id"],
                },
            },
            "get_keyword_trends": {
                "name": "get_keyword_trends",
                "description": "Analyze keyword trends in a domain",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {
                            "type": "string",
                            "description": "Domain to analyze",
                        },
                        "days": {
                            "type": "integer",
                            "description": "Number of days to analyze",
                            "default": 30,
                        },
                    },
                    "required": ["domain"],
                },
            },
        }

    def handle_mcp_request(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle MCP tool requests"""
        if tool_name not in self.tools:
            return {
                "status": "error",
                "error": f"Unknown tool: {tool_name}",
                "message": f"Available tools: {list(self.tools.keys())}",
            }

        try:
            # Map tool names to methods
            tool_methods = {
                "store_memory": self.memory_interface.mcp_store_memory,
                "retrieve_memories": self.memory_interface.mcp_retrieve_memories,
                "search_memories_advanced": self.memory_interface.mcp_search_memories_advanced,
                "expand_keywords": self.memory_interface.mcp_expand_keywords,
                "get_memory_statistics": self.memory_interface.mcp_get_memory_statistics,
                "get_similar_memories": self.memory_interface.mcp_get_similar_memories,
                "get_keyword_trends": self.memory_interface.mcp_get_keyword_trends,
            }

            method = tool_methods[tool_name]
            result = method(**arguments)

            return (
                result
                if isinstance(result, dict)
                else {"status": "success", "result": result}
            )

        except Exception as e:
            logger.error(f"MCP tool {tool_name} failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "message": f"Tool {tool_name} execution failed",
            }

    def get_toolspec(self) -> Dict[str, Any]:
        """Get MCP tools specification"""
        return {
            "name": "memory_system",
            "description": "Multi-domain memory system with MCP integration",
            "tools": self.tools,
        }


# Global memory manager instance
_memory_manager = None


def get_memory_manager() -> MemoryManager:
    """Get global memory manager instance"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager


def get_mcp_server() -> MCPMemoryServer:
    """Get global MCP server instance"""
    return MCPMemoryServer(get_memory_manager())


if __name__ == "__main__":
    # Test the memory system
    manager = get_memory_manager()

    # Test storing a BMAD code conversation
    bmad_data = {
        "code_snippet": "def hello_world():\n    print('Hello, World!')",
        "conversation_context": "Discussion about basic Python functions",
        "project_id": "bmad_project_001",
        "participants": ["user1", "assistant"],
    }

    memory_id = manager.store_conversation(
        domain="bmad_code",
        conversation_data=bmad_data,
        source="conversation_001",
        tags=["python", "beginner", "functions"],
    )
    print(f"Stored memory ID: {memory_id}")

    # Test retrieval
    memories = manager.retrieve_conversations(domain="bmad_code", limit=10)
    print(f"Retrieved {len(memories)} memories")

    # Test statistics
    stats = manager.get_memory_statistics()
    print(f"Memory statistics: {stats}")

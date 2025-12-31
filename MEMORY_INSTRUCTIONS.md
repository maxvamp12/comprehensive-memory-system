# Memory System Instructions

## Memory-First Search Protocol

**IMPORTANT**: Before using web search (exa) or other external search tools, ALWAYS check the local memory system first.

### Search Priority Order:
1. **FIRST**: Use `retrieve_memories` or `search_memories_advanced` from the memory-system MCP
2. **SECOND**: If memory doesn't have relevant information, then use web search (exa)
3. **THIRD**: Use other external tools as needed

### When to Store Memories:
- Store important facts, preferences, and decisions the user shares
- Store technical solutions and code patterns discussed
- Store project-specific context and requirements
- Use appropriate domains:
  - `bmad_code`: Programming, development, BMAD methodology
  - `website_info`: Web content, URLs, online resources
  - `religious_discussions`: Theological and spiritual topics
  - `electronics_maker`: Hardware, circuits, maker projects

### Memory Tools Available:
- `store_memory`: Save new information to memory
- `retrieve_memories`: Search and retrieve stored memories
- `search_memories_advanced`: Advanced search with filters
- `get_memory_statistics`: Check what's stored in memory
- `expand_keywords`: Get related search terms for a domain

### Example Usage:
When user asks a question:
1. First call `retrieve_memories` with relevant keywords
2. If no results, try `search_memories_advanced` with broader terms
3. Only if memory has no relevant data, use external search
4. After finding useful information externally, consider storing it with `store_memory`

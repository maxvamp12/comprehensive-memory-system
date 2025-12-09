class MemoryConsolidator {
    consolidate(memories) {
        const unique = [];
        const seen = new Set();
        
        memories.forEach(memory => {
            const key = `${memory.content}_${memory.timestamp}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(memory);
            }
        });
        
        return unique;
    }
}

module.exports = MemoryConsolidator;
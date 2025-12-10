class MemoryIntegrator {
    integrate(context, memories) {
        const integrated = {
            enhancedContext: context,
            relevantMemories: [],
            memoryContext: '',
            integrationScore: 0.0
        };

        // Find relevant memories
        integrated.relevantMemories = this.findRelevantMemories(context, memories);
        
        // Generate memory context
        integrated.memoryContext = this.generateMemoryContext(integrated.relevantMemories);
        
        // Calculate integration score
        integrated.integrationScore = this.calculateIntegrationScore(integrated.relevantMemories, context);

        return integrated;
    }

    findRelevantMemories(context, memories) {
        return memories
            .filter(memory => this.calculateRelevance(memory, context) > 0.1)
            .sort((a, b) => this.calculateRelevance(b, context) - this.calculateRelevance(a, context))
            .slice(0, 5); // Top 5 memories
    }

    calculateRelevance(memory, context) {
        const memoryWords = this.tokenize(memory.content || '');
        const contextWords = this.tokenize(context);
        
        const intersection = memoryWords.filter(word => contextWords.includes(word));
        const maxWords = Math.max(memoryWords.length, contextWords.length);
        
        return intersection.length / maxWords; // Simplified relevance
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 1);
    }

    generateMemoryContext(memories) {
        if (memories.length === 0) return '';
        
        const topics = memories.map(m => this.extractTopic(m.content || ''));
        const uniqueTopics = [...new Set(topics)];
        
        return `Related topics: ${uniqueTopics.join(', ')}`;
    }

    extractTopic(content) {
        const words = content.toLowerCase().split(' ');
        const keywords = ['project', 'meeting', 'person', 'place', 'thing', 'event'];
        
        for (const word of words) {
            if (keywords.includes(word)) {
                return word;
            }
        }
        
        return 'general';
    }

    calculateIntegrationScore(memories, context) {
        if (memories.length === 0) return 0.0;
        
        const avgRelevance = memories.reduce((sum, m) => sum + this.calculateRelevance(m, context), 0) / memories.length;
        return Math.min(1.0, avgRelevance + (memories.length * 0.1));
    }
}

module.exports = MemoryIntegrator;
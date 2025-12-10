class ResponseGenerator {
    generateResponse(context, memories) {
        const response = {
            text: '',
            confidence: 0.0,
            sources: []
        };

        if (memories.length > 0) {
            response.text = this.generateMemoryBasedResponse(context, memories);
            response.confidence = this.calculateConfidence(memories);
            response.sources = memories.map(m => m.id);
        } else {
            response.text = this.generateFallbackResponse(context);
            response.confidence = 0.3;
        }

        return response;
    }

    generateMemoryBasedResponse(context, memories) {
        const relevantMemories = memories.filter(m => this.isRelevant(m, context));
        
        if (relevantMemories.length === 0) {
            return this.generateFallbackResponse(context);
        }

        const summary = this.summarizeMemories(relevantMemories);
        return `Based on what I know: ${summary}`;
    }

    summarizeMemories(memories) {
        if (memories.length === 1) {
            return memories[0].original || memories[0].content || "No content available";
        }
        
        const keyPoints = memories.map(m => (m.original || m.content || "No content").substring(0, 50));
        return `I remember several things: ${keyPoints.join(', ')}`;
    }

    generateFallbackResponse(context) {
        const responses = [
            "I don't have specific information about that.",
            "I don't recall anything about that topic.",
            "That's not something I have stored in my memory."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    calculateConfidence(memories) {
        if (memories.length === 0) return 0.0;
        
        const avgConfidence = memories.reduce((sum, m) => sum + (m.confidence || 0.5), 0) / memories.length;
        return Math.min(1.0, avgConfidence + 0.1);
    }

    isRelevant(memory, context) {
        const memoryWords = (memory.content || memory.original || '').toLowerCase().split(' ');
        const contextWords = context.toLowerCase().split(' ');
        
        const overlap = memoryWords.filter(word => contextWords.includes(word));
        return overlap.length > 0;
    }
}

module.exports = ResponseGenerator;
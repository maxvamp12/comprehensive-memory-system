class TemporalAnalyzer {
    extractDates(text) {
        const dates = [];
        const patterns = [
            /\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/g,
            /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g,
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                dates.push({
                    date: match[0],
                    position: match.index,
                    confidence: 0.8
                });
            }
        });
        
        return dates;
    }
}

module.exports = TemporalAnalyzer;
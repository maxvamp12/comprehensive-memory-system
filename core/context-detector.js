const winston = require('winston');
const natural = require('natural');
const compromise = require('compromise');

class ContextDetector {
    constructor(config = {}) {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/context-detector.log' }),
                new winston.transports.Console()
            ]
        });

        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.classifier = new natural.BayesClassifier();
        
        // Configuration
        this.minConfidence = config.minConfidence || 0.7;
        this.importanceKeywords = config.importanceKeywords || [
            'important', 'crucial', 'essential', 'key', 'significant',
            'remember', 'note', 'reminder', 'fact', 'detail'
        ];
        this.declarativePatterns = [
            /\b(is|are|was|were|has|have|had|can|could|will|would|should|must)\s+\w+/i,
            /\b(i|you|he|she|it|we|they)\s+(think|believe|feel|know|understand|assume)/i,
            /\b(this|that|these|those)\s+(is|are|was|were)/i
        ];

        this.initializeClassifier();
    }

    initializeClassifier() {
        // Train classifier with example patterns
        this.classifier.addDocument('I remember that my cat is named Whiskers', 'declarative');
        this.classifier.addDocument('This is important information about my preferences', 'declarative');
        this.classifier.addDocument('What is the weather like?', 'question');
        this.classifier.addDocument('Can you help me with something?', 'question');
        this.classifier.addDocument('Tell me about the project', 'command');
        this.classifier.addDocument('Please update the document', 'command');
        
        this.classifier.train();
    }

    detectInformation(text) {
        const analysis = {
            original: text,
            isDeclarative: this.isDeclarativeStatement(text),
            importanceScore: this.calculateImportance(text),
            confidence: this.calculateConfidence(text),
            entities: this.extractEntities(text),
            categories: this.categorize(text),
            timestamp: new Date().toISOString()
        };

        analysis.shouldStore = this.shouldStoreMemory(analysis);
        
        this.logger.info('Information detection complete', analysis);
        return analysis;
    }

    isDeclarativeStatement(text) {
        // Check for declarative patterns
        for (const pattern of this.declarativePatterns) {
            if (pattern.test(text)) return true;
        }

        // Check for sentence structure
        const sentences = text.split(/[.!?]+/);
        if (sentences.length === 0) return false;

        // Check if first sentence ends with period (likely declarative)
        const firstSentence = sentences[0].trim();
        return firstSentence.endsWith('.');
    }

    calculateImportance(text) {
        let score = 0.3; // Base score

        // Check for importance keywords
        const words = this.tokenizer.tokenize(text.toLowerCase());
        for (const keyword of this.importanceKeywords) {
            if (words.includes(keyword)) score += 0.2;
        }

        // Check for personal pronouns (often indicates personal information)
        const personalPronouns = ['i', 'my', 'mine', 'me', 'we', 'our', 'us'];
        for (const pronoun of personalPronouns) {
            if (words.includes(pronoun)) score += 0.1;
        }

        // Check for specificity (longer, more detailed statements)
        if (text.length > 50) score += 0.1;
        if (text.length > 100) score += 0.1;

        // Check for numbers (often indicates factual information)
        const numbers = text.match(/\d+/g);
        if (numbers) score += 0.1 * numbers.length;

        return Math.min(score, 1.0);
    }

    calculateConfidence(text) {
        const classification = this.classifier.classify(text);
        const classifications = this.classifier.getClassifications(text);
        
        // Find confidence for declarative statements
        const declarativeConfidence = classifications.find(c => c.label === 'declarative')?.value || 0;
        
        // Boost confidence for longer, more specific statements
        const lengthBonus = Math.min(text.length / 200, 0.2);
        
        // Reduce confidence for questions or commands
        const questionPenalty = classification === 'question' ? -0.3 : 0;
        const commandPenalty = classification === 'command' ? -0.3 : 0;

        return Math.max(0, Math.min(1, declarativeConfidence + lengthBonus + questionPenalty + commandPenalty));
    }

    extractEntities(text) {
        const doc = compromise(text);
        
        return {
            people: doc.people().out('array'),
            places: doc.places().out('array'),
            organizations: doc.organizations().out('array'),
            dates: this.extractDates(text),
            money: doc.money().out('array'),
            numbers: doc.values().out('array')
        };
    }

    categorize(text) {
        const categories = [];
        const lowerText = text.toLowerCase();

        // Simple keyword-based categorization
        const categoryPatterns = {
            personal: ['i', 'my', 'me', 'mine', 'family', 'friend', 'personal'],
            work: ['work', 'project', 'job', 'office', 'meeting', 'deadline'],
            hobby: ['hobby', 'interest', 'game', 'sport', 'activity', 'fun'],
            fact: ['fact', 'information', 'detail', 'data', 'statistic'],
            preference: ['like', 'prefer', 'enjoy', 'love', 'hate', 'dislike'],
            reminder: ['remember', 'note', 'reminder', 'todo', 'task']
        };

        for (const [category, keywords] of Object.entries(categoryPatterns)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                categories.push(category);
            }
        }

        return categories.length > 0 ? categories : ['general'];
    }

    extractDates(text) {
        // Use regex to find dates since compromise.dates() might not be available
        const datePatterns = [
            /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, // MM/DD/YYYY or DD/MM/YYYY
            /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g, // YYYY/MM/DD
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
            /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
            /\b(today|tomorrow|yesterday|next\s+week|last\s+week|this\s+week)\b/gi
        ];

        const dates = [];
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                dates.push(...matches);
            }
        }

        return dates;
    }

    shouldStoreMemory(analysis) {
        const factors = [
            analysis.isDeclarative,
            analysis.importanceScore >= 0.5,
            analysis.confidence >= this.minConfidence,
            analysis.entities.people.length > 0 || 
            analysis.entities.places.length > 0 || 
            analysis.entities.dates.length > 0 ||
            analysis.entities.numbers.length > 0,
            analysis.categories.length > 0
        ];

        const positiveFactors = factors.filter(Boolean).length;
        return positiveFactors >= 3; // At least 3 positive factors
    }

    // Utility method for testing
    testDetection(text) {
        const result = this.detectInformation(text);
        console.log('Detection Result:', JSON.stringify(result, null, 2));
        return result;
    }
}

module.exports = ContextDetector;
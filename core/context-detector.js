const winston = require('winston');

class ContextDetector {
    constructor(config = {}) {
        this.logger = winston.createLogger({
            level: config.logLevel || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'data/logs/context.log' }),
                new winston.transports.Console()
            ]
        });

        // Initialize entity patterns and detection rules
        this.initializeDetectionRules();
    }

    initializeDetectionRules() {
        // Define patterns for different types of information
        this.rules = {
            isDeclarative: {
                patterns: [
                    /\b(is|are|was|were|am)\s/i,
                    /\b(have|has|had)\s/i,
                    /\b(remember|recall|know)\s/i,
                    /\b(think|believe|feel)\s/i
                ],
                threshold: 0.3
            },
            importanceScore: {
                factors: {
                    containsNumber: 0.2,
                    containsDate: 0.3,
                    containsName: 0.4,
                    containsLocation: 0.3,
                    lengthOver50: 0.1,
                    hasMultipleEntities: 0.2
                }
            },
            entities: {
                people: /\b([A-Z][a-z]+)\s+(?:said|mentioned|told|asked)/g,
                places: /\b(?:in|at|to|from)\s+([A-Z][a-z]+)/g,
                organizations: /\b([A-Z][a-z]+(?:\s+(?:Inc|Corp|LLC|Ltd|Company))?)\b/g,
                dates: /\b(?:today|tomorrow|yesterday|last\s+\w+|next\s+\w+|\d{1,2}\/\d{1,2}\/\d{4})\b/g,
                money: /\$(\d+(?:\.\d{2})?)/g,
                numbers: /\b\d+(?:\.\d+)?\b/g
            },
            categories: {
                personal: /\b(I|me|my|mine)\b/i,
                work: /\b(work|job|office|meeting|project)\b/i,
                family: /\b(family|mother|father|sister|brother|child|parent)\b/i,
                health: /\b(health|doctor|hospital|medicine|sick|ill)\b/i,
                finance: /\b(money|bank|loan|invest|salary|budget)\b/i,
                travel: /\b(travel|trip|flight|hotel|vacation)\b/i
            }
        };
    }

    detectInformation(text) {
        const detection = {
            timestamp: new Date().toISOString(),
            isDeclarative: this.checkDeclarative(text),
            importanceScore: this.calculateImportance(text),
            confidence: this.calculateConfidence(text),
            entities: this.extractEntities(text),
            categories: this.extractCategories(text),
            shouldStore: false
        };

        // Decision logic for storing
        detection.shouldStore = detection.importanceScore >= 0.3 || 
                               (detection.isDeclarative && detection.importanceScore >= 0.2);

        this.logger.info('Information detected', {
            shouldStore: detection.shouldStore,
            importanceScore: detection.importanceScore,
            isDeclarative: detection.isDeclarative
        });

        return detection;
    }

    checkDeclarative(text) {
        const declarativePatterns = this.rules.isDeclarative.patterns;
        let matchCount = 0;

        declarativePatterns.forEach(pattern => {
            if (pattern.test(text)) {
                matchCount++;
            }
        });

        return matchCount / declarativePatterns.length >= this.rules.isDeclarative.threshold;
    }

    calculateImportance(text) {
        let score = 0;
        const factors = this.rules.importanceScore.factors;

        // Check for numbers
        if (/\d+/.test(text)) score += factors.containsNumber;

        // Check for dates
        if (this.rules.entities.dates.test(text)) score += factors.containsDate;

        // Check for names (simplified)
        if (this.rules.entities.people.test(text)) score += factors.containsName;

        // Check for locations
        if (this.rules.entities.places.test(text)) score += factors.containsLocation;

        // Check for length
        if (text.length > 50) score += factors.lengthOver50;

        // Check for multiple entities
        const entityMatches = (text.match(/(?:[A-Z][a-z]+|[A-Z][A-Z]+)/g) || []).length;
        if (entityMatches > 2) score += factors.hasMultipleEntities;

        // Normalize to 0-1 range
        return Math.min(score, 1.0);
    }

    calculateConfidence(text) {
        // Simple confidence based on text length and declarative nature
        let confidence = 0.5;

        if (text.length > 20) confidence += 0.2;
        if (text.length > 50) confidence += 0.1;
        if (this.checkDeclarative(text)) confidence += 0.2;

        return Math.min(confidence, 1.0);
    }

    extractEntities(text) {
        const entities = {
            people: [],
            places: [],
            organizations: [],
            dates: [],
            money: [],
            numbers: []
        };

        // Extract people
        let match;
        while ((match = this.rules.entities.people.exec(text)) !== null) {
            entities.people.push(match[1]);
        }

        // Extract places
        while ((match = this.rules.entities.places.exec(text)) !== null) {
            entities.places.push(match[1]);
        }

        // Extract organizations
        while ((match = this.rules.entities.organizations.exec(text)) !== null) {
            entities.organizations.push(match[1]);
        }

        // Extract dates
        while ((match = this.rules.entities.dates.exec(text)) !== null) {
            entities.dates.push(match[0]);
        }

        // Extract money
        while ((match = this.rules.entities.money.exec(text)) !== null) {
            entities.money.push(match[0]);
        }

        // Extract numbers
        while ((match = this.rules.entities.numbers.exec(text)) !== null) {
            entities.numbers.push(match[0]);
        }

        return entities;
    }

    extractCategories(text) {
        const categories = [];

        Object.keys(this.rules.categories).forEach(category => {
            const pattern = this.rules.categories[category];
            if (pattern.test(text)) {
                categories.push(category);
            }
        });

        return categories.length > 0 ? categories : ['general'];
    }

    testDetection(text) {
        return this.detectInformation(text);
    }
}

module.exports = ContextDetector;
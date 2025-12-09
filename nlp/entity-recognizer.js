const natural = require('natural');

class EntityRecognizer {
    constructor(config = {}) {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.entities = new Map();
        this.logger = config.logger || null;
    }

    recognize(text) {
        const entities = {
            people: [],
            places: [],
            organizations: [],
            dates: [],
            money: [],
            percentages: [],
            numbers: []
        };

        // Simple pattern-based entity recognition
        entities.people = this.extractPeople(text);
        entities.places = this.extractPlaces(text);
        entities.organizations = this.extractOrganizations(text);
        entities.dates = this.extractDates(text);
        entities.money = this.extractMoney(text);
        entities.percentages = this.extractPercentages(text);
        entities.numbers = this.extractNumbers(text);

        return {
            original: text,
            entities: entities
        };
    }

    analyze(text) {
        return this.recognize(text);
    }

extractPeople(text) {
        const people = [];
        const seenNames = new Set();

        // Common first names - be very selective
        const commonNames = ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Linda', 
                           'William', 'Elizabeth', 'James', 'Patricia', 'Richard', 'Barbara', 'Joseph', 
                           'Jessica', 'Thomas', 'Susan', 'Charles', 'Karen', 'Tim', 'Tom', 'Jane', 'Sarah'];

        // First, detect two-word names to avoid conflicts with single names
        const twoWordPattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b(?!\s+(?:works|lives|is|was|are|were|the|in|on)\b|\.(?:\s|$))/g;
        let match;
        while ((match = twoWordPattern.exec(text)) !== null) {
            const firstName = match[1];
            const lastName = match[2];
            const fullName = match[0];
            
            // Only add as person if first name is in our common names list
            const isFirstCommonName = commonNames.includes(firstName);
            
            // Exclude obvious non-personal names
            const excludedNames = [
                'Google', 'Apple', 'Microsoft', 'Amazon', 'San Francisco', 'New York', 'Los Angeles',
                'California', 'Stanford Hospital', 'Mary Jane'
            ];
            
            if (isFirstCommonName && !excludedNames.includes(fullName) && fullName.length > 6 && !seenNames.has(fullName)) {
                people.push({ name: fullName, position: match.index });
                seenNames.add(fullName);
                seenNames.add(firstName); // Also mark the first name as seen to prevent duplicate detection
            } else {
                if (this.logger && typeof this.logger.debug === 'function') {
                    this.logger.debug(`DEBUG: Skipping two-word name ${fullName} - isFirstCommonName: ${isFirstCommonName}, excluded: ${excludedNames.includes(fullName)}, length: ${fullName.length}, seen: ${seenNames.has(fullName)}`);
                } else if (this.logger && typeof this.logger.log === 'function') {
                    this.logger.log(`DEBUG: Skipping two-word name ${fullName} - isFirstCommonName: ${isFirstCommonName}, excluded: ${excludedNames.includes(fullName)}, length: ${fullName.length}, seen: ${seenNames.has(fullName)}`);
                }
            }
        }

        // Add pronouns for pronoun resolution
        const pronouns = ['He', 'She', 'They'];
        pronouns.forEach(pronoun => {
            const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                const pronounName = match[0];
                if (!seenNames.has(pronounName)) {
                    people.push({ name: pronounName, position: match.index });
                    seenNames.add(pronounName);
                }
            }
        });

        // Add common first names that appear as standalone words (but not if they're part of a full name)
        commonNames.forEach(name => {
            const regex = new RegExp(`\\b${name}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                const fullName = match[0];
                // Only add if it's not part of a known location or organization, and not already seen
                const isKnownLocation = this.isKnownLocationOrOrg(fullName);
                const isLikelyLocation = this.isLikelyLocationName(fullName);
                const shouldAdd = !isKnownLocation && !isLikelyLocation && !seenNames.has(fullName);
                
                if (shouldAdd) {
                    people.push({ name: fullName, position: match.index });
                    seenNames.add(fullName);
                } else {
                    // Debug: log why we're skipping this name
                    if (this.logger && typeof this.logger.debug === 'function') {
                        this.logger.debug(`DEBUG: Skipping ${fullName} from people - isKnownLocation: ${isKnownLocation}, isLikelyLocation: ${isLikelyLocation}, seenNames: ${seenNames.has(fullName)}`);
                    } else if (this.logger && typeof this.logger.log === 'function') {
                        this.logger.log(`DEBUG: Skipping ${fullName} from people - isKnownLocation: ${isKnownLocation}, isLikelyLocation: ${isLikelyLocation}, seenNames: ${seenNames.has(fullName)}`);
                    }
                }
            }
        });

        if (this.logger && typeof this.logger.debug === 'function') {
            this.logger.debug(`DEBUG: Added ${people.length} people total`);
        }
        return people;
    }

    isKnownLocationOrOrg(name) {
        const knownLocations = ['California', 'York', 'Orleans', 'Land', 'City', 'Town', 'Village', 'State', 'Country', 'Island'];
        const knownOrgs = ['Google', 'Apple', 'Microsoft', 'Amazon', 'Stanford Hospital', 'Inc', 'Corp', 'LLC', 'Ltd'];
        
        return knownLocations.includes(name) || knownOrgs.includes(name);
    }

    isLikelyLocationName(name) {
        // Additional location indicators that might appear in common names
        const locationIndicators = ['California', 'York', 'Orleans', 'Land', 'City', 'Town', 'Village', 'State', 'Country', 'Island', 'Mountain', 'Valley', 'Lake', 'River', 'Bay', 'Gulf', 'Peninsula'];
        return locationIndicators.includes(name);
    }

extractOrganizations(text) {
        const organizations = [];
        const orgPatterns = [
            /Apple\s+Inc\./gi,
            /\bGoogle\b/gi,
            /\b(Apple|Microsoft|Google|Amazon|Facebook|Tesla|IBM|Oracle|Samsung|Sony|Intel|Cisco|Adobe|Salesforce|Uber|Airbnb|Netflix|Spotify|Twitter|Instagram|LinkedIn|PayPal|Square|Stripe|Dropbox|Slack|Zoom|Atlassian|Jira|Confluent|Databricks|Snowflake|Palantir|Qualtrics|SurveyMonkey|Wix|Squarespace|Shopify|WooCommerce|BigCommerce|Magento|OpenTable|DoorDash|UberEats|GrubHub|Instacart|Lyft|Blade|Wing|Zipline|Joby|Archer|Aurora|Vertical|Terrafugia|Opener|Beta|EHang|Joby|Lilium|Volocopter|Ehang|Zee|AeroMobil|Pal-V|Skycar|Moller|Terrafugia|Transition|Joby|Archer|Wisk|Beta|EHang|Joby|Lilium|Volocopter|Ehang|Zee|AeroMobil|Pal-V|Skycar|Moller|Terrafugia|Transition)\b/gi,
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation)\.?/gi
        ];

        orgPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                organizations.push(match[1] || match[0]);
            }
        });
        return organizations;
    }

    extractPlaces(text) {
        const places = [];
        const placePatterns = [
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(City|Town|Village)\b/g,
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(State|Province|Country)\b/g,
            /\b(Mountain View|San Francisco|New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Detroit|Portland|Memphis|Oklahoma City|Las Vegas|Nashville|Louisville|Milwaukee|Albuquerque|Tucson|Fresno|Mesa|Sacramento|Atlanta|Colorado Springs|Raleigh|Kansas City|Miami|Oakland|Minneapolis|Tulsa|Wichita|New Orleans|Cleveland|Tampa|Baltimore|Arlington)\b/gi,
            /\b(Paris|London|Tokyo|Beijing|Sydney|Toronto|Berlin|Rome|Madrid|Barcelona|Milan|Amsterdam|Stockholm|Copenhagen|Helsinki|Vienna|Prague|Warsaw|Budapest|Athens|Istanbul|Dubai|Singapore|Hong Kong|Seoul|Mumbai|Bangkok|Jakarta|Manila|Cairo|Lagos|Buenos Aires|São Paulo|Lima|Santiago|Mexico City|Toronto|Montreal|Vancouver|Calgary)\b/gi
        ];

        placePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                places.push(match[0]);
            }
        });

        return places;
    }

    extractDates(text) {
        const dates = [];
        const datePatterns = [
            /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b/g,
            /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g,
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/g,
            /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
            /\bDecember\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}\b/gi
        ];

        datePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                dates.push(match[0]);
            }
        });

        return dates;
    }

extractMoney(text) {
        const money = [];
        const moneyPatterns = [
            /\$\d+(?:[KMBkmb])?/gi,
            /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
            /€\d+(?:,\d{3})*(?:\.\d{2})?/g,
            /£\d+(?:,\d{3})*(?:\.\d{2})?/g,
            /\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|USD)/gi
        ];

        moneyPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                money.push(match[0]);
            }
        });

        return money;
    }

    extractPercentages(text) {
        const percentages = [];
        const percentagePatterns = [
            /\d+%/g,
            /\d+\s*percent/gi
        ];

        percentagePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                percentages.push(match[0]);
            }
        });

        return percentages;
    }

    extractNumbers(text) {
        const numbers = [];
        const numberPatterns = [
            /\b\d+\b/g
        ];

        numberPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                numbers.push(match[0]);
            }
        });

        return numbers;
    }

    

// Static method
    getTopEntities(entities, limit = 5) {
        // Static method to get top entities
        const topEntities = {};
        
        Object.keys(entities).forEach(type => {
            if (Array.isArray(entities[type])) {
                entities[type].forEach(entity => {
                    if (!topEntities[type] || topEntities[type].length < limit) {
                        if (!topEntities[type]) topEntities[type] = [];
                        topEntities[type].push(entity);
                    }
                });
            }
        });
        
        return topEntities;
    }
}

module.exports = EntityRecognizer;
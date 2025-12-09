class RelationshipMapper {
    constructor(config = {}) {
        this.relationships = new Map();
        this.relationshipTypes = [
            'works_at',
            'lives_in', 
            'created',
            'related_to',
            'located_in',
            'associated_with'
        ];
        this.logger = config.logger || null;
    }

    mapRelationships(text, entities = null, context = null) {
        const relationships = [];
        
        // If no entities provided, extract from text
        if (!entities) {
            entities = this.extractEntitiesFromText(text);
            entities.originalText = text; // Store original text for pattern matching
        } else {
            entities.originalText = text; // Ensure original text is available
        }
        
        // Ensure compatibility with entity recognizer output
        // Map 'places' to 'locations' if locations doesn't exist but places does
        if (!entities.locations && entities.places) {
            entities.locations = entities.places;
        }
        
        // Extract relationships between entities
        relationships.push(...this.extractWorkRelationships(entities));
        relationships.push(...this.extractLocationRelationships(entities));
        relationships.push(...this.extractFamilyRelationships(entities));
        relationships.push(...this.extractTemporalRelationships(entities));
        relationships.push(...this.extractPossessionRelationships(entities));
        relationships.push(...this.extractCreationRelationships(entities));
        relationships.push(...this.extractGeneralRelationships(entities, context || text));

        const scoredRelationships = this.scoreRelationships(relationships);
        
        // Organize relationships by type for the test expectations - only include types that have relationships
        const organizedRelationships = {};
        
        if (scoredRelationships.some(rel => rel.type === 'works_at')) {
            organizedRelationships.work = scoredRelationships.filter(rel => rel.type === 'works_at').map(rel => ({
                person: rel.from,
                organization: rel.to,
                type: rel.type,
                confidence: rel.confidence
            }));
        }
        
        if (scoredRelationships.some(rel => rel.type === 'lives_in')) {
            organizedRelationships.location = scoredRelationships.filter(rel => rel.type === 'lives_in').map(rel => ({
                person: rel.from,
                place: rel.to,
                type: rel.type,
                confidence: rel.confidence
            }));
        }
        
        const familyRelationships = scoredRelationships.filter(rel => ['related_to', 'sibling', 'parent_child', 'spouse'].includes(rel.type) && rel.confidence > 0.6);
        if (familyRelationships.length > 0) {
            organizedRelationships.family = familyRelationships.map(rel => ({
                person1: rel.from,
                person2: rel.to,
                type: rel.type === 'related_to' ? 'family' : rel.type,
                confidence: rel.confidence
            }));
        }
        
        if (scoredRelationships.some(rel => rel.type === 'temporal' || rel.type === 'created')) {
            organizedRelationships.temporal = scoredRelationships.filter(rel => rel.type === 'temporal' || rel.type === 'created').map(rel => ({
                from: rel.from,
                to: rel.to,
                type: 'temporal',
                confidence: rel.confidence
            }));
        }
        
        if (scoredRelationships.some(rel => rel.type === 'possessed_by' || rel.type === 'associated_with')) {
            organizedRelationships.possession = scoredRelationships.filter(rel => rel.type === 'possessed_by' || rel.type === 'associated_with').map(rel => ({
                person: rel.from,
                item: rel.to,
                type: 'possession',
                confidence: rel.confidence
            }));
        }

        return {
            original: text,
            entities: entities,
            relationships: organizedRelationships
        };
    }
    
    extractEntitiesFromText(text) {
        // Handle empty text case
        if (!text || text.trim() === '') {
            return {
                people: [],
                organizations: [],
                locations: [],
                products: [],
                concepts: [],
                originalText: ''
            };
        }
        
        // Simple entity extraction for testing
        const entities = {
            people: [],
            organizations: [],
            locations: [],
            products: [],
            concepts: []
        };
        
        // Basic pattern matching for demo purposes
        // This is a simplified version - in real implementation, use NLP library
        
// More flexible people detection - include common pronouns and proper names
        const commonWords = ['This', 'That', 'The', 'And', 'But', 'Or', 'When', 'Where', 'Why', 'How', 'What', 'Who', 'Which', 'His', 'Her', 'Their', 'My', 'Your', 'Our', 'Its'];
        const peopleMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|He|She|They|John|Mary|Sarah|Tom|Tim|Bob|Alice|David|Emily|Michael|Jennifer|Chris|Sarah|Tom)/g) || [];
        
        // Filter out common words that aren't actual names, but be more permissive
        const filteredPeople = peopleMatches.filter(name => {
            const trimmed = name.trim();
            return !commonWords.includes(trimmed) && trimmed.length > 1;
        });
        
        // More flexible organization detection - common org patterns
        const orgMatches = text.match(/([A-Z][a-z]+(?:\\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital|Google|Microsoft|Apple|Amazon|Facebook|Tesla)))/g) || [];
        
        // Also match standalone organization names
        const standaloneOrgs = text.match(/\b(Google|Microsoft|Apple|Amazon|Facebook|Tesla|IBM|Oracle|Intel|Cisco|HP|Dell|Sony|Samsung|Oracle|Salesforce|Adobe|Oracle|Oracle|Oracle)\b/gi) || [];
        
        // Combine and deduplicate
        const allOrgs = [...new Set([...orgMatches, ...standaloneOrgs])];
        
        // More flexible location detection - common location patterns  
        const locationMatches = text.match(/\b(California|Texas|New York|Florida|Illinois|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|New Jersey|Arizona|Virginia|Washington|Massachusetts|Colorado|Maryland|Minnesota|Missouri|Wisconsin|Tennessee|Indiana|South Carolina|Alabama|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|Idaho|Hawaii|West Virginia|Maine|New Hampshire|Rhode Island|Montana|Delaware|South Dakota|North Dakota|Alaska|Wyoming)\b/g) || [];
        
        // Process unique people matches
        const uniquePeople = [...new Set(peopleMatches)];
        uniquePeople.forEach((name, index) => {
            entities.people.push({
                name: name.trim(),
                position: text.indexOf(name)
            });
        });
        
        // Process unique organization matches
        const uniqueOrgs = [...new Set(allOrgs)];
        uniqueOrgs.forEach((name, index) => {
            entities.organizations.push({
                name: name.trim(),
                position: text.indexOf(name)
            });
        });
        
        // Process unique location matches
        const uniqueLocations = [...new Set(locationMatches)];
        uniqueLocations.forEach((name, index) => {
            entities.locations.push({
                name: name.trim(),
                position: text.indexOf(name)
            });
        });
        
        // Basic product detection - include common possession items
        const productMatches = text.match(/\b(house|car|salary|wage|income|pay|property|asset|investment|stock|bond|fund)\b/gi) || [];
        const uniqueProducts = [...new Set(productMatches)];
        uniqueProducts.forEach((name, index) => {
            entities.products.push({
                name: name.trim(),
                position: text.indexOf(name)
            });
        });
        
        // Basic concept detection
        const conceptMatches = text.match(/([a-z]+(?:\s+[a-z]+)*)(?:\s+(?:idea|concept|method|approach|strategy|technique))/gi) || [];
        const uniqueConcepts = [...new Set(conceptMatches)];
        uniqueConcepts.forEach((name, index) => {
            entities.concepts.push({
                name: name.trim(),
                position: text.indexOf(name)
            });
        });
        
        return entities;
    }

    extractWorkRelationships(entities) {
        const relationships = [];
        
        const people = entities.people || [];
        const organizations = entities.organizations || [];
        
// Pattern-based work relationship detection
        const workPatterns = [
            // Simple works at pattern - more restrictive to avoid over-matching
            /(\\w+(?:\\s+\\w+)*)\\s+works\\s+(?:at|for|in)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*(?:\\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital))?)\\b/gi,
            // Employed by pattern
            /(\w+(?:\s+\w+)*)\s+employed\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital))?)(?=\s+|$)/gi,
            // Staff at pattern
            /(\w+(?:\s+\w+)*)\s+staff\s+at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital))?)(?=\s+|$)/gi,
            // CEO pattern with comma separation
            /(?:CEO|President|Director|Manager)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital))?)\s*,?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
            // Multiple work relationships pattern
            /(\\w+(?:\\s+\\w+)*)\\s+works\\s+(?:at|for|in)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*(?:\\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital))?)\\b\\s*(?:and|,|\\s+also\\s+)\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*(?:\\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital)))\\b/gi
        ];
        
        workPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                let personName, orgName;
                
                // Handle CEO pattern differently - it has organization in group 1 and person in group 2
                if (pattern.source.includes('CEO|President|Director|Manager')) {
                    personName = match[2];
                    orgName = match[1];
                } else {
                    personName = match[1];
                    orgName = match[2];
                }
                
                console.log('Pattern match:', pattern.source);
                console.log('Person:', personName, 'Org:', orgName);
                console.log('Match groups:', match);
                
                // Clean up organization name by removing trailing common words
                const commonTrailingWords = ['as', 'a', 'an', 'the', 'with', 'in', 'on', 'at', 'for', 'by', 'to', 'of', 'and', 'or', 'but', 'as', 'a', 'software', 'engineer', 'developer', 'manager', 'director', 'ceo', 'president', 'vp', 'vice', 'president', 'lives', 'works', 'has', 'had', 'is', 'are', 'was', 'were', 'be', 'been'];
                const words = orgName.split(' ');
                let removedWords = 0;
                while (words.length > 1 && commonTrailingWords.includes(words[words.length - 1].toLowerCase())) {
                    words.pop();
                    removedWords++;
                    if (removedWords > 3) break; // Prevent infinite loops
                }
                orgName = words.join(' ');
                
                // Find the actual entities
                const person = people.find(p => p.name.toLowerCase() === personName.toLowerCase()) || 
                              { name: personName, position: match.index };
                const org = organizations.find(o => o.name.toLowerCase() === orgName.toLowerCase()) || 
                           { name: orgName, position: match.index + (pattern.source.includes('CEO|President|Director|Manager') ? 4 : match[1].length + 4) }; // approximate position
                
                relationships.push({
                    from: person.name,
                    to: org.name,
                    type: 'works_at',
                    confidence: 0.9
                });
            }
        });
        
        // Removed proximity-based work relationship detection to avoid false positives
        // Only pattern-based detection is used for reliability

        return relationships;
    }

    extractLocationRelationships(entities) {
        const relationships = [];
        
        const people = entities.people || [];
        const locations = entities.locations || [];
        
// Helper function to resolve pronouns to actual person names
        const resolvePronoun = (pronoun, textPosition, allPeople) => {
            const pronounToLower = pronoun.toLowerCase();
            
            // For "He", find the most recent male person before this position
            if (pronounToLower === 'he') {
                const maleNames = ['John', 'David', 'Michael', 'Chris', 'Tom', 'Tim', 'Bob', 'Alice'];
                const malePeople = allPeople.filter(p => maleNames.includes(p.name));
                const beforePosition = malePeople.filter(p => p.position < textPosition);
                return beforePosition.length > 0 ? beforePosition[beforePosition.length - 1].name : pronoun;
            }
            // For "She", find the most recent female person before this position  
            else if (pronounToLower === 'she') {
                const femaleNames = ['Mary', 'Sarah', 'Emily', 'Jennifer', 'Alice'];
                const femalePeople = allPeople.filter(p => femaleNames.includes(p.name));
                const beforePosition = femalePeople.filter(p => p.position < textPosition);
                return beforePosition.length > 0 ? beforePosition[beforePosition.length - 1].name : pronoun;
            }
            // For "They", find the most recent person (any gender) before this position
            else if (pronounToLower === 'they') {
                const beforePosition = allPeople.filter(p => p.position < textPosition);
                return beforePosition.length > 0 ? beforePosition[beforePosition.length - 1].name : pronoun;
            }
            
            return pronoun;
        };
        
        // Pattern-based location relationship detection
        const locationPatterns = [
            /(\w+|He|She|They)\s+lives\s+in\s+(\w+)/gi,
            /(\w+|He|She|They)\s+resides\s+in\s+(\w+)/gi,
            /(\w+|He|She|They)\s+located\s+in\s+(\w+)/gi,
            /(\w+|He|She|They)\s+stays\s+in\s+(\w+)/gi
        ];
        
        locationPatterns.forEach((pattern, index) => {
            
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                console.log('Location pattern matched:', match);
                const personName = match[1];
                const locationName = match[2];
                
                // Resolve pronouns to actual person names
                const resolvedPersonName = resolvePronoun(personName, match.index, people);
                
                // Find the actual entities
                const person = people.find(p => p.name.toLowerCase() === resolvedPersonName.toLowerCase()) || 
                              { name: resolvedPersonName, position: match.index };
                const location = locations.find(l => l.name.toLowerCase() === locationName.toLowerCase()) || 
                                { name: locationName, position: match.index + match[1].length + 4 }; // approximate position
                
                relationships.push({
                    from: person.name,
                    to: location.name,
                    type: 'lives_in',
                    confidence: 0.9
                });
            }
        });
        
        // Removed proximity-based location relationship detection to avoid false positives
        // Only pattern-based detection is used for reliability

        return relationships;
    }

    extractFamilyRelationships(entities) {
        const relationships = [];
        const people = entities.people || [];
        
        // Pattern-based family relationship detection - avoid possessive pronouns
        const familyPatterns = [
            /([A-Z][a-z]+)\s+(?:is\s+)?(?:the\s+)?(?:sister|brother|daughter|son|father|mother|parent|child|wife|husband|spouse)\s+(?:of\s+)?([A-Z][a-z]+)/gi,
            /([A-Z][a-z]+)\s+(?:sister|brother|daughter|son|father|mother|parent|child|wife|husband|spouse)\s+(?:of\s+)?([A-Z][a-z]+)/gi,
            /([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\s+(?:are\s+)?(?:sisters|brothers|couple|married)/gi,
            /\b(?:his|her|their)\s+(?:wife|husband|spouse)\s+([A-Z][a-z]+)/gi,
            /\b(?:his|her|their)\s+(?:sister|brother|daughter|son|father|mother)\s+([A-Z][a-z]+)/gi
        ];
        
        familyPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                let person1Name = match[1].trim();
                const person2Name = match[2] ? match[2].trim() : null;
                
                
                
                // Resolve possessive pronouns to actual person names
                if (['his', 'her', 'their'].includes(person1Name.toLowerCase())) {
                    const resolvedPerson = this.resolvePronoun(person1Name, entities.originalText, people);
                    if (resolvedPerson) {
                        person1Name = resolvedPerson;
                    }
                }
                
                // Skip if person2Name is null (single group patterns)
                if (!person2Name) {
                    continue;
                }
                
                // Find the actual entities
                const person1 = people.find(p => p.name.toLowerCase() === person1Name.toLowerCase()) || 
                              { name: person1Name, position: match.index };
                const person2 = people.find(p => p.name.toLowerCase() === person2Name.toLowerCase()) || 
                              { name: person2Name, position: match.index + match[1].length + 2 };
                
                // Determine relationship type based on pattern
                let relationshipType = 'related_to';
                const text = match[0].toLowerCase();
                if (text.includes('sister') || text.includes('brother')) relationshipType = 'sibling';
                else if (text.includes('daughter') || text.includes('son')) relationshipType = 'parent_child';
                else if (text.includes('father') || text.includes('mother')) relationshipType = 'parent_child';
                else if (text.includes('wife') || text.includes('husband') || text.includes('spouse') || text.includes('couple')) relationshipType = 'spouse';
                
                relationships.push({
                    from: person1.name,
                    to: person2.name,
                    type: relationshipType,
                    confidence: 0.9,
                    originalText: match[0]
                });
            }
        });
        
        return relationships;
    }

    resolvePronoun(pronoun, text, people) {
        // Simple pronoun resolution based on proximity and context
        const pronounLower = pronoun.toLowerCase();
        const sentences = text.split(/[.!?]+/);
        
        for (const sentence of sentences) {
            const pronounIndex = sentence.toLowerCase().indexOf(pronounLower);
            if (pronounIndex !== -1) {
                // Look for person names before the pronoun in the same sentence
                const beforePronoun = sentence.substring(0, pronounIndex);
                const words = beforePronoun.split(/\s+/);
                
                // Look backwards for a person name
                for (let i = words.length - 1; i >= 0; i--) {
                    const word = words[i].replace(/[^a-zA-Z]/g, '');
                    if (word && word[0] === word[0].toUpperCase()) {
                        // Check if this is a known person
                        const person = people.find(p => p.name.toLowerCase() === word.toLowerCase());
                        if (person) {
                            return person.name;
                        }
                        // If not a known person, use it as it's likely a name
                        return word;
                    }
                }
            }
        }
        
        // Fallback: return the pronoun itself
        return pronoun;
    }

    extractTemporalRelationships(entities) {
        const relationships = [];
        const people = entities.people || [];
        const events = [];
        
        // Extract temporal events and dates from text
        const temporalPatterns = [
            /(\w+(?:\s+\w+)*)\s+(?:on|at|in|during)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/gi,
            /(\w+(?:\s+\w+)*)\s+(?:before|after|since|until)\s+(\w+(?:\s+\w+)*)/gi,
            /(\w+(?:\s+\w+)*)\s+(?:earlier|later)\s+than\s+(\w+(?:\s+\w+)*)/gi
        ];
        
        temporalPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                const event1 = match[1].trim();
                const event2 = match[2].trim();
                
                // Create event entities if they don't exist
                if (!events.find(e => e.name === event1)) {
                    events.push({
                        name: event1,
                        position: match.index,
                        type: 'event'
                    });
                }
                if (!events.find(e => e.name === event2)) {
                    events.push({
                        name: event2,
                        position: match.index + match[1].length + 4,
                        type: 'event'
                    });
                }
                
                relationships.push({
                    from: event1,
                    to: event2,
                    type: 'temporal',
                    confidence: 0.8,
                    originalText: match[0]
                });
            }
        });
        
        return relationships;
    }

    extractPossessionRelationships(entities) {
        const relationships = [];
        const people = entities.people || [];
        const items = entities.products || [];
        
// Pattern-based possession relationship detection
        const possessionPatterns = [
            /(\w+)\s+(?:owns|has|possesses|own)\s+(?:a|an|the)?\s*(\w+(?:\s+\w+)*)/gi,
            /(\w+)\s+(?:possesses|own)\s+(?:a|an|the)?\s*(\w+(?:\s+\w+)*)/gi,
            /(?:a|an|the)\s*(\w+(?:\s+\w+)*)\s+(?:belongs to|owned by)\s+(\w+)/gi,
            // Handle possessive forms like "John's salary"
            /(\w+)'s\s+(?:salary|wage|income|pay|house|car|property|asset|investment|stock|bond|fund)/gi
        ];
        
        possessionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                let personName, itemName;
                
                // Handle possessive patterns differently
                if (pattern.source.includes('\'s')) {
                    personName = match[1].trim();
                    // For possessive patterns, the item name is the matched word after 's
                    const possessiveText = match[0];
                    const itemMatch = possessiveText.match(/'s\s+(salary|wage|income|pay|house|car|property|asset|investment|stock|bond|fund)/);
                    itemName = itemMatch ? itemMatch[1].trim() : possessiveText.split("'s")[1].trim();
                } else {
                    personName = match[1].trim();
                    itemName = match[2].trim();
                }
                
                // Find the actual entities
                const person = people.find(p => p.name.toLowerCase() === personName.toLowerCase()) || 
                              { name: personName, position: match.index };
                const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase()) || 
                            { name: itemName, position: match.index + match[1].length + 4 };
                
                relationships.push({
                    from: person.name,
                    to: item.name,
                    type: 'possessed_by',
                    confidence: 0.9,
                    originalText: match[0]
                });
            }
        });
        
        return relationships;
    }

    extractCreationRelationships(entities) {
        const relationships = [];
        
        const people = entities.people || [];
        const products = entities.products || [];
        const concepts = entities.concepts || [];
        
        // Pattern-based creation detection to avoid false positives
        const creationPatterns = [
            /([A-Z][a-z]+)\s+(?:created|invented|developed|built|designed|developed)\s+(?:the\s+)?([a-z\s]+(?:product|item|device|tool|software|app|service|idea|concept|method|approach|strategy|technique))/gi
        ];
        
        creationPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(entities.originalText || '')) !== null) {
                const personName = match[1].trim();
                const itemName = match[2].trim();
                
                const person = people.find(p => p.name.toLowerCase() === personName.toLowerCase()) || 
                              { name: personName, position: match.index };
                const item = [...products, ...concepts].find(i => i.name.toLowerCase() === itemName.toLowerCase()) || 
                            { name: itemName, position: match.index + match[1].length + 4 };
                
                relationships.push({
                    from: person.name,
                    to: item.name,
                    type: 'created',
                    confidence: 0.9
                });
            }
        });

        return relationships;
    }

    extractGeneralRelationships(entities, context) {
        const relationships = [];
        const keywords = ['related', 'associated', 'connected', 'linked'];
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\s+to\\s+([A-Z][a-z]+)`, 'gi');
            let match;
            while ((match = regex.exec(context)) !== null) {
                const entityName = match[1];
                const sourceEntity = this.findEntityByName(entities, entityName);
                if (sourceEntity) {
                    relationships.push({
                        from: entityName,
                        to: 'related_context',
                        type: 'related_to',
                        confidence: 0.7
                    });
                }
            }
        });

        return relationships;
    }

    isNearby(entity1, entity2) {
        const distance = Math.abs(entity1.position - entity2.position);
        return distance < 100; // Within 100 characters
    }

    calculateProximityConfidence(entity1, entity2) {
        const distance = Math.abs(entity1.position - entity2.position);
        const maxDistance = 200;
        const confidence = 1 - (distance / maxDistance);
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    findEntityByName(entities, name) {
        for (const [type, items] of Object.entries(entities)) {
            const found = items.find(item => item.name.toLowerCase() === name.toLowerCase());
            if (found) return found;
        }
        return null;
    }

    scoreRelationships(relationships) {
        return relationships.map(rel => ({
            ...rel,
            // Boost confidence based on entity types
            confidence: this.boostByEntityTypes(rel)
        }));
    }

    boostByEntityTypes(relationship) {
        let boost = 1.0;
        
        // Boost work relationships
        if (relationship.type === 'works_at' && 
            (this.isPerson(relationship.from) || this.isOrganization(relationship.to))) {
            boost *= 1.2;
        }
        
        // Boost location relationships  
        if (relationship.type === 'lives_in' && 
            (this.isPerson(relationship.from) || this.isLocation(relationship.to))) {
            boost *= 1.2;
        }
        
        // Boost creation relationships
        if (relationship.type === 'created' && 
            (this.isPerson(relationship.from) || this.isConceptOrProduct(relationship.to))) {
            boost *= 1.3;
        }
        
        return Math.min(1.0, relationship.confidence * boost);
    }

    isPerson(name) {
        return /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name);
    }

    isOrganization(name) {
        return /(Inc|Corp|LLC|Ltd|Company|Corporation|University|School|Hospital)$/.test(name);
    }

    isLocation(name) {
        return /(City|Town|Village|State|Province|Country)$/.test(name);
    }

    isConceptOrProduct(name) {
        return /(product|item|device|tool|software|app|service|idea|concept|method|approach|strategy|technique)$/.test(name.toLowerCase());
    }

    storeRelationship(relationship) {
        const key = `${relationship.from}_${relationship.to}_${relationship.type}`;
        this.relationships.set(key, relationship);
    }

    getRelationships(entity, type = null) {
        const results = [];
        
        for (const [key, rel] of this.relationships) {
            if (rel.from === entity || rel.to === entity) {
                if (!type || rel.type === type) {
                    results.push(rel);
                }
            }
        }
        
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    getTopRelationships(limit = 10) {
        return Array.from(this.relationships.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);
    }
}

module.exports = RelationshipMapper;
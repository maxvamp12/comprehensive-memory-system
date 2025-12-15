const RelationshipMapper = require('./nlp/relationship-mapper');
const winston = require('winston');

describe('RelationshipMapper - Core Functionality', () => {
    let mapper;

    beforeEach(() => {
        // Create a logger for testing
        const logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({ silent: true })
            ]
        });

        mapper = new RelationshipMapper({ logger });
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(mapper).toBeDefined();
            expect(mapper.logger).toBeDefined();
        });

        test('should initialize with custom configuration', () => {
            const customLogger = winston.createLogger({
                level: 'debug',
                transports: [new winston.transports.Console({ silent: true })]
            });
            
            const customMapper = new RelationshipMapper({ 
                logger: customLogger,
                customOption: 'test-value'
            });
            expect(customMapper.logger).toBe(customLogger);
        });
    });

    describe('Relationship Detection', () => {
        test('should detect work relationships', () => {
            const text = "John works at Google as a software engineer.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.work).toBeDefined();
            
            const workRelations = result.relationships.work;
            expect(workRelations.some(rel => rel.person === 'John' && rel.organization === 'Google')).toBe(true);
        });

        test('should detect location relationships', () => {
            const text = "Mary lives in California and works in San Francisco.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.location).toBeDefined();
            
            const locationRelations = result.relationships.location;
            expect(locationRelations.some(rel => rel.person === 'Mary' && rel.place === 'California')).toBe(true);
        });

        test('should detect family relationships', () => {
            const text = "Sarah is the sister of John and daughter of Mary.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.family).toBeDefined();
            
            const familyRelations = result.relationships.family;
            expect(familyRelations.length).toBeGreaterThan(0);
        });

        test('should detect temporal relationships', () => {
            const text = "The meeting on December 25th was before the conference on January 10th.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.temporal).toBeDefined();
            
            const temporalRelations = result.relationships.temporal;
            expect(temporalRelations.length).toBeGreaterThan(0);
        });

        test('should detect possession relationships', () => {
            const text = "John owns a house and Mary has a car.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.possession).toBeDefined();
            
            const possessionRelations = result.relationships.possession;
            expect(possessionRelations.length).toBeGreaterThan(0);
        });
    });

    describe('Complex Relationship Analysis', () => {
        test('should handle complex text with multiple relationship types', () => {
            const text = "John works at Google as a senior engineer. He lives in California with his wife Mary, who is a doctor at Stanford Hospital. They have two children: Sarah and Tom. John's salary is $120,000 per year.";
            const result = mapper.mapRelationships(text);
            
            // Debug output
            console.log('=== DEBUG: Complex Text Analysis ===');
            console.log('Entities detected:', JSON.stringify(result.entities, null, 2));
            console.log('Relationships:', JSON.stringify(result.relationships, null, 2));
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.work).toBeDefined();
            expect(result.relationships.location).toBeDefined();
            expect(result.relationships.family).toBeDefined();
            expect(result.relationships.possession).toBeDefined();
            
            // Verify specific relationships
            const workRelations = result.relationships.work;
            expect(workRelations.some(rel => rel.person === 'John' && rel.organization === 'Google')).toBe(true);
            
            const locationRelations = result.relationships.location;
            expect(locationRelations.some(rel => rel.person === 'John' && rel.place === 'California')).toBe(true);
            
            const familyRelations = result.relationships.family;
            expect(familyRelations.some(rel => rel.person1 === 'John' && rel.person2 === 'Mary' && rel.type === 'spouse')).toBe(true);
        });

        test('should detect nested relationships', () => {
            const text = "The CEO of Apple, Tim Cook, who also serves on the board of Nike, announced a new product.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.relationships.work).toBeDefined();
            
            const workRelations = result.relationships.work;
            expect(workRelations.some(rel => rel.person === 'Tim Cook' && rel.organization === 'Apple')).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty text', () => {
            const result = mapper.mapRelationships("");
            
            expect(result).toBeDefined();
            expect(result.original).toBe("");
            expect(result.relationships).toBeDefined();
            expect(Object.keys(result.relationships).length).toBe(0);
        });

        test('should handle text with no detectable relationships', () => {
            const result = mapper.mapRelationships("This is a simple sentence without any relationships.");
            
            expect(result).toBeDefined();
            expect(result.original).toBe("This is a simple sentence without any relationships.");
            expect(result.relationships).toBeDefined();
            expect(Object.keys(result.relationships).length).toBe(0);
        });

        test('should handle ambiguous relationship cases', () => {
            const text = "I saw the man with the telescope.";
            const result = mapper.mapRelationships(text);
            
            expect(result).toBeDefined();
            expect(result.original).toBe(text);
            expect(result.relationships).toBeDefined();
        });
    });

    describe('Relationship Validation', () => {
        test('should validate relationship structure', () => {
            const text = "John works at Google.";
            const result = mapper.mapRelationships(text);
            
            expect(result.relationships.work).toBeDefined();
            const workRelations = result.relationships.work;
            
            workRelations.forEach(relation => {
                expect(relation).toHaveProperty('person');
                expect(relation).toHaveProperty('organization');
                expect(relation).toHaveProperty('type');
            });
        });

        test('should handle multiple relationships of the same type', () => {
            const text = "John works at Google and Microsoft. He also lives in California.";
            const result = mapper.mapRelationships(text);
            
            expect(result.relationships.work).toBeDefined();
            expect(result.relationships.work.length).toBe(2);
            
            expect(result.relationships.location).toBeDefined();
            expect(result.relationships.location.length).toBe(1);
        });
    });
});
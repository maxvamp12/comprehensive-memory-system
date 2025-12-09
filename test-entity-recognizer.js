const EntityRecognizer = require('./nlp/entity-recognizer');
const winston = require('winston');

describe('EntityRecognizer - Core Functionality', () => {
    let recognizer;

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

        recognizer = new EntityRecognizer({ logger });
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(recognizer).toBeDefined();
            expect(recognizer.logger).toBeDefined();
        });

        test('should initialize with custom configuration', () => {
            const customLogger = winston.createLogger({
                level: 'debug',
                transports: [new winston.transports.Console({ silent: true })]
            });
            
            const customRecognizer = new EntityRecognizer({ 
                logger: customLogger,
                customOption: 'test-value'
            });
            expect(customRecognizer.logger).toBe(customLogger);
        });
    });

    describe('Text Analysis', () => {
        test('should analyze basic text', () => {
            const text = "John works at Google and lives in California.";
            const result = recognizer.recognize(text);
            
            expect(result).toBeDefined();
            expect(result.original).toBe(text);
            expect(result.entities).toBeDefined();
        });

        test('should detect people', () => {
            const text = "John and Mary went to the store.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.people).toBeDefined();
            expect(result.entities.people).toContainEqual({name: 'John', position: 0});
            expect(result.entities.people).toContainEqual({name: 'Mary', position: 9});
        });

        test('should detect places', () => {
            const text = "I visited Paris and London last summer.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.places).toBeDefined();
            expect(result.entities.places).toContain('Paris');
            expect(result.entities.places).toContain('London');
        });

        test('should detect organizations', () => {
            const text = "Apple and Microsoft are tech companies.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.organizations).toBeDefined();
            expect(result.entities.organizations).toContain('Apple');
            expect(result.entities.organizations).toContain('Microsoft');
        });

        test('should detect dates', () => {
            const text = "The meeting is on December 25th, 2024.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.dates).toBeDefined();
            expect(result.entities.dates.length).toBeGreaterThan(0);
        });

        test('should detect money', () => {
            const text = "The cost was $100 and €50.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.money).toBeDefined();
            expect(result.entities.money.length).toBeGreaterThan(0);
        });

        test('should detect percentages', () => {
            const text = "The growth rate was 25% and 50% increase.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.percentages).toBeDefined();
            expect(result.entities.percentages.length).toBeGreaterThan(0);
        });

        test('should detect numbers', () => {
            const text = "I have 3 apples and 5 oranges.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.numbers).toBeDefined();
            expect(result.entities.numbers).toContain('3');
            expect(result.entities.numbers).toContain('5');
        });
    });

    describe('Entity Validation', () => {
        test('should validate entity types', () => {
            const text = "John works at Google in California on December 25th for $100.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.people).toBeDefined();
            expect(result.entities.organizations).toBeDefined();
            expect(result.entities.places).toBeDefined();
            expect(result.entities.dates).toBeDefined();
            expect(result.entities.money).toBeDefined();
        });

        test('should handle empty text', () => {
            const result = recognizer.recognize("");
            
            expect(result).toBeDefined();
            expect(result.original).toBe("");
            expect(result.entities).toBeDefined();
        });

        test('should handle text with no entities', () => {
            const result = recognizer.recognize("This is just a simple sentence without any entities.");
            
            expect(result).toBeDefined();
            expect(result.original).toBe("This is just a simple sentence without any entities.");
            expect(result.entities).toBeDefined();
        });
    });

    describe('Complex Text Analysis', () => {
        test('should analyze complex text with multiple entity types', () => {
            const text = "On January 15, 2024, John Smith from Apple Inc. will meet Mary Johnson at Google's office in Mountain View to discuss a $1M investment with 20% equity stake.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.people).toBeDefined();
            expect(result.entities.people).toContainEqual({name: 'John Smith', position: 21});
            expect(result.entities.people).toContainEqual({name: 'Mary Johnson', position: 58});
            
            expect(result.entities.organizations).toBeDefined();
            expect(result.entities.organizations).toContain('Apple Inc.');
            expect(result.entities.organizations).toContain('Google');
            
            expect(result.entities.places).toBeDefined();
            expect(result.entities.places).toContain('Mountain View');
            
            expect(result.entities.dates).toBeDefined();
            expect(result.entities.dates).toContain('January 15, 2024');
            
            expect(result.entities.money).toBeDefined();
            expect(result.entities.money).toContain('$1M');
            
            expect(result.entities.percentages).toBeDefined();
            expect(result.entities.percentages).toContain('20%');
        });

        test('should handle ambiguous entity cases', () => {
            const text = "Washington is a state and the capital of the US. Washington University is located there.";
            const result = recognizer.recognize(text);
            
            expect(result.entities.places).toBeDefined();
            expect(result.entities.places.length).toBeGreaterThan(0);
        });
    });
});
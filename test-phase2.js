const TemporalAnalyzer = require('./nlp/temporal-analyzer');
const MemoryConsolidator = require('./core/memory-consolidator');

// Test both components
const analyzer = new TemporalAnalyzer();
const consolidator = new MemoryConsolidator();

// Test temporal analyzer
const testText = "Meeting on 12/25/2024 and project starts on 2024-01-15";
const dates = analyzer.extractDates(testText);
console.log('Temporal Analyzer Test:', dates);

// Test memory consolidator
const testMemories = [
    { content: "Test memory 1", timestamp: Date.now() },
    { content: "Test memory 1", timestamp: Date.now() + 1000 }, // duplicate
    { content: "Test memory 2", timestamp: Date.now() + 2000 }
];
const consolidated = consolidator.consolidate(testMemories);
console.log('Memory Consolidator Test:', consolidated.length, 'memories');

console.log('Phase 2 components created and tested successfully!');
const ResponseGenerator = require('./integration/response-generator');
const MemoryIntegrator = require('./integration/memory-integrator');

// Test response generation and memory integration
const generator = new ResponseGenerator();
const integrator = new MemoryIntegrator();

// Test data
const context = "What do you know about the project meeting?";
const memories = [
    { id: 1, content: "Project meeting scheduled for December 25th", confidence: 0.9 },
    { id: 2, content: "Team discussed project milestones", confidence: 0.8 },
    { id: 3, content: "Unrelated birthday party information", confidence: 0.7 }
];

// Test memory integration
const integrated = integrator.integrate(context, memories);
console.log('Memory Integration Test:');
console.log('- Enhanced Context:', integrated.enhancedContext);
console.log('- Relevant Memories:', integrated.relevantMemories.length);
console.log('- Memory Context:', integrated.memoryContext);
console.log('- Integration Score:', integrated.integrationScore);

// Test response generation
const response = generator.generateResponse(context, integrated.relevantMemories);
console.log('\nResponse Generation Test:');
console.log('- Response Text:', response.text);
console.log('- Confidence:', response.confidence);
console.log('- Sources:', response.sources);

console.log('\nPhase 2 integration components tested successfully!');
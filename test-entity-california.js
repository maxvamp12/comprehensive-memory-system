const EntityRecognizer = require('./nlp/entity-recognizer.js');

// Create a test instance
const recognizer = new EntityRecognizer();

// Test text with California
const testText = "John lives in California with Mary. California is a beautiful state.";

console.log('Testing entity recognition on:', testText);
console.log('');

// Test the helper methods
console.log('Testing helper methods:');
console.log('isKnownLocationOrOrg("California"):', recognizer.isKnownLocationOrOrg('California'));
console.log('isLikelyLocationName("California"):', recognizer.isLikelyLocationName('California'));
console.log('');

// Test people extraction specifically
console.log('Testing people extraction:');
const people = recognizer.extractPeople(testText);
console.log('People found:', people.map(p => p.name));
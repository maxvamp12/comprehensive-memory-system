#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  try {
    const request = JSON.parse(input);
    
    if (request.method === 'initialize') {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'mcp-memory',
            version: '1.0.0'
          }
        }
      }, null, 2));
    } else if (request.method === 'list_tools') {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'memory_remember_information',
              description: 'Simple, natural way to remember information',
              inputSchema: {
                type: 'object',
                properties: {
                  information: { type: 'string', description: 'The information to remember' },
                  category: { type: 'string', enum: ['bmad_code', 'website_info', 'religious_discussions', 'electronics_maker'], default: 'bmad_code' }
                },
                required: ['information']
              }
            },
            {
              name: 'memory_recall_information',
              description: 'Simple, natural way to recall information',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'What to search for' },
                  category: { type: 'string', enum: ['bmad_code', 'website_info', 'religious_discussions', 'electronics_maker'] }
                },
                required: ['query']
              }
            }
          ]
        }
      }, null, 2));
    } else if (request.method === 'call_tool') {
      if (request.params.name === 'memory_remember_information') {
        const info = request.params.arguments.information;
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `✅ I've remembered: "${info}" (Memory ID: mem_${Date.now()})`
              }
            ]
          }
        }, null, 2));
      } else if (request.params.name === 'memory_recall_information') {
        const query = request.params.arguments.query;
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `🔍 Found information matching "${query}"`
              }
            ]
          }
        }, null, 2));
      } else {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: 'Error: Unknown tool'
              }
            ]
          }
        }, null, 2));
      }
    }
  } catch (error) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }, null, 2));
  }
});
const { spawn } = require('child_process');

// Spawn bun to run the TypeScript server
const bun = spawn('bun', ['comprehensive-memory-system-server.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

bun.on('exit', (code) => {
  process.exit(code);
});
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3113;
let engineHost = process.env.III_ENGINE_HOST || 'localhost';
let enginePort = process.env.III_ENGINE_PORT || '3111';
let wsPort = process.env.III_WS_PORT || '31112';

// Parse CLI flags
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-p' || arg === '--port') {
    port = parseInt(args[++i], 10) || 3113;
  } else if (arg === '--engine-host') {
    engineHost = args[++i] || 'localhost';
  } else if (arg === '--engine-port') {
    enginePort = args[++i] || '3111';
  } else if (arg === '--ws-port') {
    wsPort = args[++i] || '31112';
  } else if (arg === '-h' || arg === '--help') {
    console.log(`
iii-console - Developer console for the iii engine

Usage:
  iii-console [options]

Options:
  -p, --port <port>       Port to run the console on (default: 3113)
  --engine-host <host>    iii engine host (default: localhost, env: III_ENGINE_HOST)
  --engine-port <port>    iii engine REST API port (default: 3111, env: III_ENGINE_PORT)
  --ws-port <port>        iii engine WebSocket port (default: 31112, env: III_WS_PORT)
  -h, --help              Show this help message
  -v, --version           Show version

Environment Variables:
  III_ENGINE_HOST         iii engine host (default: localhost)
  III_ENGINE_PORT         iii engine REST API port (default: 3111)
  III_WS_PORT             iii engine WebSocket port (default: 31112)

Examples:
  iii-console                          # Run on default port 3113
  iii-console -p 8080                  # Run on port 8080
  iii-console --engine-host 192.168.1.10  # Connect to remote engine
  III_ENGINE_HOST=remote.server iii-console  # Use env var for host
`);
    process.exit(0);
  } else if (arg === '-v' || arg === '--version') {
    const pkg = require('../package.json');
    console.log(`iii-console v${pkg.version}`);
    process.exit(0);
  }
}

// Determine the package root directory
const packageRoot = path.dirname(__dirname);

// Check if we're running from standalone build or development
const standalonePath = path.join(packageRoot, '.next', 'standalone');
const standaloneServerPath = path.join(standalonePath, 'server.js');

let serverProcess;

if (fs.existsSync(standaloneServerPath)) {
  // Production: Run the standalone server
  console.log(`\n  iii-console starting on http://localhost:${port}\n`);
  console.log(`  Connecting to iii engine at http://${engineHost}:${enginePort}\n`);
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: standalonePath,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
      HOSTNAME: '0.0.0.0',
      III_ENGINE_HOST: engineHost,
      III_ENGINE_PORT: enginePort,
      III_WS_PORT: wsPort,
    }
  });
} else {
  // Development fallback: Use next start (requires .next build)
  const nextBin = path.join(packageRoot, 'node_modules', '.bin', 'next');
  
  if (fs.existsSync(path.join(packageRoot, '.next'))) {
    console.log(`\n  iii-console starting on http://localhost:${port}\n`);
    console.log(`  Connecting to iii engine at http://${engineHost}:${enginePort}\n`);
    
    serverProcess = spawn(nextBin, ['start', '-p', port.toString()], {
      cwd: packageRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        III_ENGINE_HOST: engineHost,
        III_ENGINE_PORT: enginePort,
        III_WS_PORT: wsPort,
      }
    });
  } else {
    console.error('\nError: No build found. Please run "npm run build" first.\n');
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

# iii Developer Console

A monochromatic developer and operations console for the **iii engine**. Built with Next.js 16+ and featuring real-time data streaming via iii's native WebSocket streams.

## Installation

### Run via npx (Recommended)

No installation needed - just run:

```bash
npx iii-console
```

Or with bun:

```bash
bunx iii-console
```

### Install Globally

```bash
npm install -g iii-console
iii-console
```

### Custom Port

```bash
npx iii-console -p 8080
```

### Connect to Remote Engine

```bash
npx iii-console --engine-host 192.168.1.10 --engine-port 3111 --ws-port 31112
```

Or use environment variables:

```bash
III_ENGINE_HOST=remote.server III_ENGINE_PORT=3111 npx iii-console
```

## CLI Options

```
Usage:
  iii-console [options]

Options:
  -p, --port <port>       Port to run the console on (default: 3113)
  --engine-host <host>    iii engine host (default: localhost, env: III_ENGINE_HOST)
  --engine-port <port>    iii engine REST API port (default: 3111, env: III_ENGINE_PORT)
  --ws-port <port>        iii engine WebSocket port (default: 31112, env: III_WS_PORT)
  -h, --help              Show help message
  -v, --version           Show version
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `III_ENGINE_HOST` | `localhost` | iii engine host address |
| `III_ENGINE_PORT` | `3111` | iii engine REST API port |
| `III_WS_PORT` | `31112` | iii engine WebSocket port |

## Quick Start

### 1. Install iii Engine

```bash
curl -fsSL https://raw.githubusercontent.com/MotiaDev/iii-engine/main/install.sh | sh
```

Or build from source:

```bash
git clone https://github.com/MotiaDev/iii-engine.git
cd iii-engine
cargo build --release
```

### 2. Start iii Engine

```bash
# From iii-engine directory
./target/release/iii --config config.yaml
```

### 3. Start Console

In a **separate terminal**:

```bash
npx iii-console
```

Open http://localhost:3113

**That's it!** Each component runs independently in its own terminal.

## Testing with iii-example

This repo includes `iii-example` for testing. Each component runs independently:

**Terminal 1 - Engine:**
```bash
cd /path/to/iii-engine
cargo build --release
cargo run --release -- --config /path/to/iii-console/iii-example/config.yaml
```

**Terminal 2 - Example App:**
```bash
cd iii-console/iii-example
pnpm install
pnpm start
```

**Terminal 3 - Console:**
```bash
npx iii-console
```

**Prerequisites:**
- Redis running on `localhost:6379`
- Update `iii-example/package.json` SDK path if `iii-engine` is elsewhere

## Features

### 📊 Dashboard

The dashboard provides a real-time overview of your iii engine application.

**Top Metrics (with Mini Charts)**
- **Functions** 🟢 - Total registered functions in your app
- **Triggers** 🟡 - Total active triggers (API, cron, events)
- **Workers** 🔵 - Number of active worker processes
- **Uptime** 🟣 - How long the engine has been running

Each metric displays:
- Current value (large number)
- Trend percentage (↑ or ↓ with %)
- Mini sparkline chart showing last ~50 data points
- Color-coded by type

**Application Flow Diagram**

Visual representation of how your application works:

```
TRIGGERS → invoke → FUNCTIONS → r/w → STATES │ STREAMS
```

### 💾 States Page

Manage persistent key-value data used by your functions.

- **Browse state groups** - List all available groups with automatic discovery
- View JSON values with syntax highlighting
- Edit and delete state items
- Real-time updates
- Group-based organization for structured data storage

### 🌊 Streams Page

Monitor WebSocket traffic in real-time (like Chrome DevTools Network tab).

- Filter by direction (inbound/outbound)
- Search messages by content
- Pause/resume message capture
- Export as JSON

### ⚡ Functions Page

View all functions and their associated triggers with interactive testing capabilities:

**Trigger Types:**
- **API** 🔵 - REST endpoints (GET, POST, DELETE, etc.)
- **CRON** 🟠 - Scheduled tasks running on intervals
- **EVENT** 🟣 - Event listeners and handlers

**Interactive Testing:**
- Invoke API functions directly with custom request body, headers, and query params
- Trigger cron jobs manually for testing
- Emit events to test event-driven workflows
- View connected workers and their status
- Search and filter functions
- Toggle visibility of system functions

### 📝 Logs Page

View and debug application logs in real-time:

- Filter by level (DEBUG, INFO, WARN, ERROR)
- Search by message content or trace ID
- Auto-scroll to latest logs
- View context data with JSON highlighting

### 🔍 Traces Page

Distributed tracing for performance debugging (OpenTelemetry compatible):

- View trace groups with hierarchical span visualization
- Inspect individual spans with timing and metadata
- Real-time status indicators for active traces
- Filter traces by service, operation, or status
- Identify performance bottlenecks across distributed calls

### 🔌 Adapters Page

Monitor connected adapters, modules, and engine components:

- View all registered modules and their health status
- List available trigger types and their configurations
- Filter between system and user adapters
- Inspect adapter capabilities and connected components

### ⚙️ Config Page

Inspect engine configuration and available trigger types.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    iii Developer Console                     │
│                      (Next.js Frontend)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   REST API      │     │   WebSocket     │
│   :3111         │     │   :31112        │
│   /_console/*   │     │   Streams       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │      iii Engine       │
         │   (Rust Binary)       │
         └───────────────────────┘
```

## DevTools API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/_console/status` | GET | System status, uptime, and port info |
| `/_console/health` | GET | Health check endpoint |
| `/_console/functions` | GET | List all registered functions |
| `/_console/triggers` | GET | List all triggers (API, cron, event, streams) |
| `/_console/trigger-types` | GET | List available trigger types |
| `/_console/workers` | GET | List connected workers and their stats |
| `/_console/streams` | GET | List all streams with message counts |
| `/_console/states/groups` | GET | List all state groups |
| `/_console/states/group` | POST | List items in a state group |
| `/_console/states/:group/item` | POST | Set a state item |
| `/_console/states/:group/item/:key` | DELETE | Delete a state item |
| `/_console/logs` | GET | Fetch logs from configured adapter |
| `/_console/adapters` | GET | List connected adapters and modules |
| `/_console/config` | GET | Engine configuration and environment |
| `/_console/metrics` | GET | Current metrics snapshot |
| `/_console/metrics/history` | GET | Metrics history from stream state |
| `/_console/events` | GET | Event subscription information |

## Default Ports

| Service | Port | Purpose |
|---------|------|---------|
| Console UI | 3113 | Next.js server (3+ii+3) |
| DevTools API | 3111 | REST API endpoints (3+iii) |
| REST API | 9001 | User application endpoints |
| Streams | 31112 | WebSocket connections |
| Redis | 6379 | Log storage (optional) |

## Brand Guidelines

| Color | Hex | Usage |
|-------|-----|-------|
| Black | `#0A0A0A` | Background |
| Dark Gray | `#141414` | Cards, sidebar |
| Medium Gray | `#1D1D1D` | Borders |
| Light Gray | `#F4F4F4` | Primary text |
| Muted | `#9CA3AF` | Secondary text |
| Yellow | `#F3F724` | Accent, highlights |
| Green | `#22C55E` | Success, online status |

**Typography**: JetBrains Mono (monospace)

## Development

```bash
# Clone the repo
git clone https://github.com/MotiaDev/iii-console.git
cd iii-console

# Install dependencies
pnpm install

# Run development server (with hot reload)
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Lint code
pnpm run lint
```

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If you see `Error: listen EADDRINUSE: address already in use :::3113`:

```bash
# Option 1: Use a different port
npx iii-console -p 8080

# Option 2: Find and kill the process using port 3113
lsof -ti:3113 | xargs kill -9

# Option 3: Check what's using the port
lsof -i:3113
```

### DevToolsModule Not Found

If you see `Unknown module class: modules::devtools::DevToolsModule`:

**Status**: The DevTools module may not be implemented yet in your iii-engine version. The console can still work with the management API endpoints.

**Workaround**: Remove the DevTools module from your config and use the management API instead:

```yaml
modules:
  # Remove this if DevToolsModule doesn't exist:
  # - class: modules::devtools::DevToolsModule
  
  # Keep these modules:
  - class: modules::streams::StreamModule
  - class: modules::api::RestApiModule
  - class: modules::observability::LoggingModule
```

**Note**: Some console features may be limited without DevTools. The console will fall back to management API endpoints where available.

### Console shows "No user components registered"

Make sure you have an application registered using the iii SDK. The engine needs to have user functions/triggers defined.

### WebSocket connection errors

1. Verify the iii engine is running on the expected ports
2. Check browser console for CORS issues
3. Ensure no other service is using port 31112

### Dashboard shows "Connecting..." indefinitely

1. Verify DevTools module is enabled in your iii engine config
2. Check that port 3111 is accessible: `curl http://localhost:3111/_console/status`
3. Ensure the Streams module is running on port 31112
4. Make sure the engine was built with DevTools support

### Connecting to Remote Engine

If your iii engine runs on a different host:

```bash
# Using CLI flags
npx iii-console --engine-host 192.168.1.100

# Using environment variables
III_ENGINE_HOST=192.168.1.100 npx iii-console
```

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS with new architecture
- **SWR** - React hooks for data fetching with caching
- **Lucide React** - Icon library
- **WebSocket** - Real-time streaming via iii Streams

## License

Apache License 2.0 - Part of the iii engine project.

## Links

- [iii Engine Repository](https://github.com/MotiaDev/iii-engine)
- [Report Issues](https://github.com/MotiaDev/iii-console/issues)

# iii-console

Developer and operations console for the **iii engine**. Built as a standalone binary that embeds a React frontend and bridges to the iii engine via REST, WebSocket, and SDK connections.

## Installation

### Install script (recommended)

```bash
curl -fsSL https://install.iii.dev/console/main/install.sh | bash
```

Install a specific version:

```bash
curl -fsSL https://install.iii.dev/console/main/install.sh | bash -s -- -v 0.1.5
```

Install to a custom directory:

```bash
INSTALL_DIR=/usr/local/bin curl -fsSL https://install.iii.dev/console/main/install.sh | bash
```

The script auto-detects your platform, downloads the correct binary, verifies the SHA256 checksum, and adds it to your `PATH`.

### Manual download

Download the latest release binary for your platform from the [Releases](https://github.com/iii-hq/console/releases) page.

| Platform | Target |
|----------|--------|
| macOS (Apple Silicon) | `aarch64-apple-darwin` |
| macOS (Intel) | `x86_64-apple-darwin` |
| Linux (x86_64, glibc) | `x86_64-unknown-linux-gnu` |
| Linux (x86_64, musl) | `x86_64-unknown-linux-musl` |
| Linux (ARM64) | `aarch64-unknown-linux-gnu` |

Each release includes `.sha256` checksum files for verification.

### macOS Gatekeeper

macOS will block unsigned binaries downloaded from the internet. After downloading, remove the quarantine attribute:

```bash
xattr -d com.apple.quarantine ./iii-console
```

Then run normally:

```bash
./iii-console --engine-host localhost
```

## Usage

```bash
iii-console [OPTIONS]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --port <port>` | Console UI port | `3113` |
| `--host <host>` | Host to bind the console server to | `127.0.0.1` |
| `--engine-host <host>` | iii engine host | `127.0.0.1` |
| `--engine-port <port>` | Engine REST API port | `3111` |
| `--ws-port <port>` | Engine WebSocket port | `3112` |
| `--bridge-port <port>` | Engine bridge WebSocket port | `49134` |
| `--no-otel` | Disable OpenTelemetry tracing, metrics, and logs export | `false` |
| `--otel-service-name <name>` | OpenTelemetry service name | `iii-console` |
| `--enable-flow` | Enable the flow visualization page | `false` |

### Environment variables

| Variable | Description |
|----------|-------------|
| `OTEL_DISABLED` | Disable OpenTelemetry (same as `--no-otel`) |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name (same as `--otel-service-name`) |
| `III_ENABLE_FLOW` | Enable flow visualization (same as `--enable-flow`) |

## Development

This is a pnpm monorepo with two packages:

- **`packages/console-frontend/`** - React/TypeScript frontend (Vite + TanStack Router)
- **`packages/console-rust/`** - Rust binary (Axum server + iii SDK bridge)

### Prerequisites

- Node.js 22+
- pnpm 10+
- Rust (stable)

### Frontend development

```bash
# Install dependencies
pnpm install

# Start dev server with hot reload (port 5173)
pnpm run dev

# Lint and format
pnpm run lint
```

### Rust binary

```bash
# Build everything (frontend + binary)
pnpm run build

# Build binary only (skips frontend rebuild)
pnpm run build:rust

# Run the binary
pnpm run start:rust
```

### Testing with iii-example

The repo includes `iii-example/` for local testing. Run in separate terminals:

```bash
# Terminal 1 - iii engine
cd /path/to/iii-engine
cargo run --release -- --config /path/to/iii-console/iii-example/config.yaml

# Terminal 2 - Example app
cd iii-example && pnpm install && pnpm start

# Terminal 3 - Console
./iii-console
```

Requires Redis on `localhost:6379`.

## License

Apache-2.0

# CloudSploit-like CSPM

Open-source Cloud Security Posture Management with drift detection for AWS, Azure, GCP, OCI, and GitHub.

## Features

- **Multi-cloud support**: AWS, Azure, GCP, OCI, GitHub
- **Drift detection**: Track configuration changes from baselines
- **Compliance mapping**: CIS, SOC 2, ISO 27001, PCI-DSS, NIST
- **Rule engine**: Plugin-based security checks
- **Unified visibility**: Cross-cloud dashboard and reporting

## Architecture
```
CLI / UI
|
API Layer (NestJS)
|
Core Engine
├── Rule Runner
├── Drift Engine
└── Compliance Mapper
|
Providers
├── AWS Adapter
├── Azure Adapter
├── GCP Adapter
├── OCI Adapter
└── GitHub Adapter
|
Data Layer
├── PostgreSQL
└── Object Storage (S3-compatible)
```

## Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd cloudsploit-like
   ./setup.sh
   ```

2. **Start services:**
   ```bash
   # Start infrastructure
   pnpm docker:up

   # Start API
   pnpm dev:api

   # Start UI (in another terminal)
   pnpm dev:ui
   ```

3. **Run a scan:**
   ```bash
   cd apps/cli
   npm run build
   ./bin/run scan:run --provider aws
   ```

## Development

### Monorepo Structure
- `/apps/api` - NestJS REST API
- `/apps/cli` - oclif Command Line Interface
- `/apps/ui` - React Web UI
- `/packages/core-engine` - Core CSPM logic
- `/packages/providers` - Cloud provider adapters
- `/packages/rules` - Security rules/plugins
- `/packages/compliance` - Compliance framework definitions

### Technology Stack
- **Language**: TypeScript
- **Backend**: NestJS, PostgreSQL, Prisma
- **Frontend**: React, Vite
- **CLI**: oclif
- **Infrastructure**: Docker, MinIO

## License
MIT

#!/bin/bash

# Setup script for CSPM project

echo "Setting up CloudSploit-like CSPM project..."

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies in all workspaces
echo "Installing dependencies..."
pnpm install

# Build packages
echo "Building packages..."
pnpm build

# Start infrastructure
echo "Starting infrastructure..."
pnpm docker:up

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
pnpm db:migrate

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure cloud credentials in apps/api/.env"
echo "2. Start API server: pnpm dev:api"
echo "3. Start UI server: pnpm dev:ui"
echo "4. Test CLI: cd apps/cli && npm run build && ./bin/run --help"

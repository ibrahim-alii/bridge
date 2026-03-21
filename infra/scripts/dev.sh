#!/usr/bin/env bash
set -euo pipefail

echo "🌉 Starting Bridge development environment..."

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is required. Install it: npm install -g pnpm"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build contracts first (required by other packages)
echo "🔨 Building shared packages..."
pnpm --filter @bridge/contracts build
pnpm --filter @bridge/shared-utils build

# Start API in background
echo "🚀 Starting API server..."
pnpm --filter @bridge/api dev &

echo ""
echo "✅ Bridge dev environment is ready!"
echo "   API: http://localhost:3727"
echo "   Extension: Open apps/extension in VS Code and press F5"
echo ""

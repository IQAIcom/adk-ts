#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

set -e

echo "🔍 Running pre-push checks..."

echo "🧹 Formatting and linting..."
pnpm format
pnpm lint

echo "🧪 Running tests..."
pnpm test

echo "✅ Pre-push checks passed."

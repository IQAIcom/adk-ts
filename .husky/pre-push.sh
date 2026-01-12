#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

set -e

echo "🔍 Running pre-push checks..."

echo "🧹 Formatting and linting..."
pnpm format
pnpm lint

# Check if packages/ changed
if git diff --name-only origin/main...HEAD 2>/dev/null | grep -q "^packages/"; then
	echo "🧪 Packages changed → Running tests..."
	pnpm test
else
	echo "ℹ️  No package changes detected → Skipping tests."
fi

echo "✅ Pre-push checks passed."

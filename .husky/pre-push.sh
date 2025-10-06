#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Detecting changed packages against origin/main..."

CHANGED=$(pnpm turbo run build --filter=...[origin/main] --dry-run=json | node -e "
  const fs = require('fs');
  let input = '';
  process.stdin.on('data', c => input += c);
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input);
      const pkgs = [...new Set(data.tasks.map(t => t.package))];
      console.log(pkgs.join('\n'));
    } catch (e) { process.exit(0); }
  });
")

if [ -z "$CHANGED" ]; then
  echo "✅ No affected packages. Skipping checks."
  exit 0
fi

echo "📦 Changed packages:"
echo "$CHANGED"

if echo "$CHANGED" | grep -q "^packages/"; then
  echo "🧪 Packages changed → Running Biome + Tests..."
  pnpm format && pnpm lint && pnpm test
else
  echo "📄 Only apps/docs/examples changed → Running Biome only..."
  pnpm format && pnpm lint
fi

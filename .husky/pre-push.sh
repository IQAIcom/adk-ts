#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

set -e

BASE_REF="origin/main"
if ! git show-ref --verify --quiet "refs/remotes/origin/main"; then
	BASE_REF="main"
fi

echo "🔍 Detecting changed files against ${BASE_REF}..."

CHANGED_FILES=$(git diff --name-only "${BASE_REF}"...HEAD)

if [ -z "${CHANGED_FILES}" ]; then
	echo "✅ No changes detected. Skipping checks."
	exit 0
fi

echo "📝 Changed files:"
echo "${CHANGED_FILES}"

echo "🧹 Running format + lint..."
pnpm format
pnpm lint

if echo "${CHANGED_FILES}" | grep -q "^packages/"; then
	echo "🧪 Packages changed → Running tests..."
	pnpm test
else
	echo "ℹ️  No package changes detected → Skipping tests."
fi

echo "✅ Pre-push checks passed."

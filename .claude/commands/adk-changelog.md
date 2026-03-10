Generate changelog entries and community release notes for ADK-TS from git history and changesets.

## Workflow

### Step 1: Gather Changes

1. **Find the last release tag:**

   ```bash
   git tag --sort=-version:refname | head -5
   ```

2. **Read git log since last tag:**

   ```bash
   git log {LAST_TAG}..HEAD --oneline --no-merges
   ```

3. **Check for pending changesets:**
   Read all `.md` files in `.changeset/` directory (excluding `README.md`). Each changeset file contains a package name, version bump type (patch/minor/major), and description.

4. **Read existing changelogs for format reference:**
   - `packages/adk/CHANGELOG.md` (last 50 lines for format)
   - `packages/adk-cli/CHANGELOG.md` (last 50 lines for format)

### Step 2: Categorize Changes

Group all changes into these categories:

| Category             | Description                                     | Emoji |
| -------------------- | ----------------------------------------------- | ----- |
| **Breaking Changes** | API changes, removed features, behavior changes | 🚨    |
| **Features**         | New capabilities, new tools, new agents         | ✨    |
| **Bug Fixes**        | Corrections to existing behavior                | 🐛    |
| **Documentation**    | Doc pages, READMEs, examples                    | 📝    |
| **Internal**         | Refactoring, dependencies, CI/CD, tests         | 🔧    |

### Step 3: Generate Changelog Entry

Format the changelog entry matching the existing style in `packages/adk/CHANGELOG.md`:

```markdown
## {VERSION}

### Major Changes

- Description of breaking change ([commit-hash])

### Minor Changes

- Description of new feature ([commit-hash])

### Patch Changes

- Description of bug fix ([commit-hash])
```

### Step 4: Draft Community Release Notes

Generate a developer-friendly release summary suitable for GitHub Releases, blog posts, or social media:

```markdown
# ADK-TS {VERSION} Release

{1-2 sentence summary of the release theme}

## Highlights

- **{Feature name}**: {Brief description of what it enables}
- **{Feature name}**: {Brief description}

## Breaking Changes

{If any, describe what changed and how to migrate}

## Bug Fixes

- {Fix description}

## Full Changelog

See the [full changelog](https://github.com/IQAIcom/adk-ts/blob/main/packages/adk/CHANGELOG.md) for all changes.

---

**Get started:** `pnpm add @iqai/adk@{VERSION}`

📖 [Documentation](https://adk.iqai.com/) | 💬 [Discussions](https://github.com/IQAIcom/adk-ts/discussions) | 🛠️ [IQ Builders Telegram](https://t.me/+Z37x8uf6DLE3ZTQ8) | 📱 [IQ AI Telegram](https://t.me/IQAICOM)
```

## Terminology Rules

When writing changelog entries and release notes:

- Always "ADK-TS" never bare "ADK"
- Use correct terms: agent (not bot), tool (not function), session (not conversation), MCP server (not MCP plugin)
- Reference packages by npm name: `@iqai/adk`, `@iqai/adk-cli`
- Link to relevant doc pages when describing new features
- Be specific about what changed — avoid vague descriptions like "improved performance"

## Output

Create two files:

- **`changelog-entry.md`** — formatted changelog entry matching the existing style in `packages/adk/CHANGELOG.md`, ready to replace or enhance the auto-generated changelog
- **`release-notes.md`** — community-facing release notes, ready for GitHub Releases page, blog posts, or Telegram announcements

Save both to the repo root. After writing, show the user a brief summary and the file paths. Remind them to delete the files after use (they're temporary working files, not meant to be committed).

**Note:** `CHANGELOG.md` and GitHub Releases are generated automatically by changesets. Use this command when you want a more polished version — e.g., to replace the auto-generated GitHub Release body, enhance the CHANGELOG.md entry, draft a Telegram announcement, or write a blog post.

Ask the user which packages the release covers if not obvious from the changesets.

Audit the ADK-TS monorepo documentation for consistency issues. Scan all READMEs, doc pages, and content files. Do NOT make any changes — only report findings.

## Audit Categories

Run each category of checks below and compile a structured report.

### 1. Brand Consistency

Search across all `.md` and `.mdx` files for:

- **Bare "ADK" usage**: Find instances where "ADK" appears without the "-TS" suffix. Exclude package names like `@iqai/adk` and CLI commands like `adk run` — focus on prose/description text that says "ADK" when it should say "ADK-TS". Common false positives to skip: `@iqai/adk`, `adk-cli`, `adk run`, `adk web`, `adk-ts` (lowercase in URLs), `ADK-TS`.
- **"Agent Development Kit" expansion**: This phrase should never appear. Search for it.
- **GitHub org casing**: Search for `IQAICOM` (uppercase) in URLs — canonical is `IQAIcom`. Exception: `https://t.me/IQAICOM` is correct for Telegram.
- **Tagline consistency**: Where the tagline appears, verify it matches "The TypeScript-Native AI Agent Framework".

### 2. URL Consistency

Verify canonical URLs are used correctly:

- GitHub repo: `https://github.com/IQAIcom/adk-ts`
- GitHub Discussions: `https://github.com/IQAIcom/adk-ts/discussions`
- Telegram: `https://t.me/IQAICOM`
- Documentation: `https://adk.iqai.com/`
- NPM: `https://www.npmjs.com/package/@iqai/adk`
- Samples: `https://github.com/IQAIcom/adk-ts-samples`

Flag any variations or broken URLs.

### 3. Node.js Version Consistency

Search for Node.js version requirements across all READMEs. The canonical version is `>=22.0`. Flag any that say `18+`, `16+`, or other versions.

### 4. Docs Site Navigation Integrity

For each directory in `apps/docs/content/docs/` that contains a `meta.json`:

- Check that every file listed in the `pages` array actually exists as a `.md` or `.mdx` file
- Check that every `.md`/`.mdx` file in the directory is listed in `meta.json` (except `index.mdx`)
- Flag orphaned pages (exist but not in navigation) and ghost entries (in navigation but file missing)

### 5. Frontmatter Completeness

Check every `.md` and `.mdx` file in `apps/docs/content/docs/`:

- Must have `title` in frontmatter
- Must have `description` in frontmatter
- Flag any pages missing either field

### 6. README Archetype Compliance

Check that each README follows its expected archetype:

- **Root README** (`README.md`): Has branded header, NPM badges, Community section
- **Package READMEs** (`packages/*/README.md`): Has branded header, NPM badges, Overview section
- **App READMEs** (`apps/*/README.md` except starter-templates): Has branded header, no NPM badges
- **Starter Template READMEs** (`apps/starter-templates/*/README.md`): Has branded header, no badges, "Built with ADK-TS" line, "Test with ADK-TS CLI" section, "Learn More" section

### 7. Starter Template Boilerplate Sync

Compare all starter template READMEs in `apps/starter-templates/*/README.md` for shared section drift:

- "Test with ADK-TS CLI" section should be identical across all
- "Learn More" links should have the same base set
- "Contributing" section should follow the same pattern
- Prerequisites should all say `>=22.0` for Node.js

### 8. Code Example Freshness

Search for potentially stale content in code examples:

- Deprecated model names (e.g., `gpt-4-turbo`, `gpt-4o`, `gpt-3.5-turbo`, `gemini-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`)
- Old import patterns that may have changed
- References to removed or renamed APIs

## Report Format

Organize findings as:

```
## 🔴 Errors (must fix)
- [file:line] Description of the issue

## 🟡 Warnings (should fix)
- [file:line] Description of the issue

## 🔵 Suggestions (nice to have)
- [file:line] Description of the issue

## ✅ Summary
- X errors, Y warnings, Z suggestions found
- Areas with best consistency: ...
- Areas needing most attention: ...
```

Be thorough but avoid false positives. When in doubt about whether something is an issue, list it as a suggestion rather than an error.

## Output File

After compiling all findings, write the full report to `docs-audit-report.md` in the repository root. This file should contain the complete structured report with all findings, so it can be reviewed and shared.

---
"@iqai/adk-cli": patch
---

ADK Web Versioning - Bundled UI Support

Added bundled web UI mode allowing the CLI to serve the web interface directly, eliminating CORS issues and simplifying local development setup.

**Key Changes:**

- Configured Next.js for static export with automatic asset copying to CLI package
- Enhanced API URL resolution to support both bundled (same-origin) and hosted modes
- Implemented SPA fallback middleware for serving static web assets
- Extracted DEFAULT_API_PORT constant and added --web-url option for custom configurations
- Updated API client hooks with proper SSR guards for static generation

**Benefits:**

- Eliminates CORS issues when running locally
- Simplifies setup (no separate web server needed)
- Maintains compatibility with hosted mode for development/production

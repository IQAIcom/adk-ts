---
"@iqai/adk-cli": patch
---

Fix debug trace session polling to handle missing or empty sessions gracefully.

Previously, the `/debug/trace/session/:sessionId` endpoint would throw `NotFoundException` errors when the frontend polled for sessions that did not exist, were cleared during hot reload, or had no recorded spans. This change returns empty results instead, preventing repeated 404 errors and reducing noisy logs during normal development workflows.

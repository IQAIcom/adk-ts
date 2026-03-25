---
"@iqai/adk": patch
---

fix: vector storage delete/count bypass stale in-memory cache

Filter-based `delete()` and `count()` in `VectorStorageProvider` now delegate to the underlying vector store instead of relying on an in-memory cache that is empty after process restart.

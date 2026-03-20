---
"@iqai/adk": patch
---

fix: share endInvocation flag by reference between parent/child contexts

endInvocation was a primitive boolean copied by value when creating child
invocation contexts, so sub-agents setting it to true never propagated to
the parent. Wrapped in a shared InvocationFlags object passed by reference.

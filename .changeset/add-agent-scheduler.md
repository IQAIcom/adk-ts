---
"@iqai/adk": minor
---

Add `AgentScheduler` for recurring agent execution

New `AgentScheduler` class that runs ADK agents on cron expressions or fixed intervals. Supports job lifecycle management (schedule, unschedule, pause, resume), manual triggering with `triggerNow` and `triggerNowStream`, overlap prevention, execution limits, per-job callbacks, and global event listeners.

```typescript
import { AgentBuilder, AgentScheduler } from "@iqai/adk";

const { runner } = await AgentBuilder
  .create("reporter")
  .withModel("gemini-2.5-flash")
  .withInstruction("Generate a daily report")
  .build();

const scheduler = new AgentScheduler();

scheduler.schedule({
  id: "daily-report",
  cron: "0 9 * * *",
  runner,
  userId: "system",
  input: "Generate today's report",
});

scheduler.start();
```

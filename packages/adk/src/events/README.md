# Event Compaction

Event Compaction is a feature that helps manage long session histories by periodically replacing ranges of events with LLM-generated summaries. This keeps context windows manageable while preserving important conversation information.

## How It Works

1. **Trigger**: After an agent completes a turn, if enough "new" user-initiated invocations have been completed since the last compaction, the compactor runs on a sliding window of invocations (with overlap).

2. **Representation**: The summarization is encoded as an Event with `actions.compaction` containing start/end timestamps and the compacted content.

3. **Consumption**: When building LLM inputs, compaction action events are converted into normal "model" events and the original covered events are filtered out.

## Configuration

```typescript
import { Runner, EventsCompactionConfig, LlmAgent } from "@iqai/adk";

const agent = new LlmAgent({
  name: "MyAgent",
  model: "gemini-2.5-flash",
  // ... other config
});

const compactionConfig: EventsCompactionConfig = {
  // Optional: provide custom summarizer
  // summarizer: new LlmEventSummarizer(customModel),
  
  // Number of new invocations needed to trigger compaction
  compactionInterval: 10,
  
  // Number of prior invocations to include for continuity
  overlapSize: 2,
};

const runner = new Runner({
  appName: "MyApp",
  agent,
  sessionService: mySessionService,
  eventsCompactionConfig: compactionConfig,
});
```

## Key Concepts

### Compaction Interval
The number of new invocations required to trigger compaction. When this many new invocations have been completed since the last compaction, a new compaction will be triggered.

### Overlap Size
The number of prior invocations to include from the previous compacted range for continuity. This ensures some overlap between successive summaries, maintaining context across compactions.

### Sliding Window
Compaction uses a sliding window approach:
- Tracks the last compacted timestamp
- Identifies new invocations since that timestamp
- When threshold is reached, compacts a window including overlap from previous range
- The window spans from `(firstNewInvocation - overlapSize)` to `lastNewInvocation`

## Custom Summarizer

You can provide a custom summarizer by implementing the `EventsSummarizer` interface:

```typescript
import { EventsSummarizer, Event, EventActions } from "@iqai/adk";

class CustomSummarizer implements EventsSummarizer {
  async maybeSummarizeEvents(events: Event[]): Promise<Event | undefined> {
    // Your custom summarization logic
    const summary = await this.generateSummary(events);
    
    if (!summary) return undefined;
    
    return new Event({
      invocationId: Event.newId(),
      author: "user",
      actions: new EventActions({
        compaction: {
          startTimestamp: events[0].timestamp,
          endTimestamp: events[events.length - 1].timestamp,
          compactedContent: {
            role: "model",
            parts: [{ text: summary }],
          },
        },
      }),
    });
  }
  
  private async generateSummary(events: Event[]): Promise<string> {
    // Your summarization implementation
  }
}
```

## Default Behavior

If no summarizer is provided, ADK will create a default `LlmEventSummarizer` using the agent's canonical model. This summarizer:
- Formats events with timestamps and authors
- Uses a prompt to request a concise summary
- Captures key information, decisions, and action items

## How Compaction Events are Processed

When building LLM request contents:

1. Events are processed in reverse order
2. When a compaction event is found:
   - A new "model" event is synthesized with the compacted content
   - The compaction's timestamp range is noted
3. Original events within compacted timestamp ranges are filtered out
4. The result is a clean history with summaries replacing compacted ranges

## Example

```typescript
// Configure runner with compaction
const runner = new Runner({
  appName: "ChatApp",
  agent: myAgent,
  sessionService: mySessionService,
  eventsCompactionConfig: {
    compactionInterval: 5,  // Compact every 5 invocations
    overlapSize: 1,         // Include 1 prior invocation for context
  },
});

// Use normally - compaction happens automatically
for await (const event of runner.runAsync({
  userId: "user123",
  sessionId: "session456",
  newMessage: { role: "user", parts: [{ text: "Hello!" }] },
})) {
  console.log(event);
}
```

After 5 invocations, the first 4-5 invocations will be summarized into a single compacted event. After 10 invocations, the next window will be summarized (including 1 invocation from the previous window for continuity), and so on.

## Benefits

- **Reduced Token Usage**: Summaries are more concise than full conversation histories
- **Improved Performance**: Smaller context windows mean faster LLM processing
- **Cost Savings**: Fewer tokens consumed per request
- **Preserved Context**: Important information is retained through summaries
- **Automatic Management**: Works transparently without code changes

## Notes

- Compaction events are not considered part of new invocations when calculating thresholds
- Compaction uses timestamps to determine boundaries, not just invocation IDs
- Overlapping compactions are handled correctly through reverse traversal
- The default summarizer uses the agent's model, ensuring consistent behavior

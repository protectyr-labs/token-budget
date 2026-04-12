# token-budget

Smart token allocation for multi-layer LLM prompts. Priority-based dropping with enrichment tracing.

## Why This Exists

When building LLM applications with rich context (system prompt, user data, conversation
history, retrieved documents), you quickly hit token limits. The naive approach — truncate
everything proportionally — loses critical context. This library lets you define priority
layers and drops the least important content first, keeping high-priority context intact.


## Demo

Run the example to see token budgeting in action:

```bash
npx tsx examples/basic.ts
```

```
=== Token Budget Demo ===

System prompt: 29 tokens
User context: 125 tokens
Chat history: 335 tokens
Retrieved docs: 93 tokens
Total unbudgeted: 582 tokens

Budget: 500 tokens
Included: system, user_context, retrieved_docs
Dropped: chat_history
Used: 379 / 500 tokens
```

The system prompt is marked `required: true` so it is always included. User context and
retrieved docs fit within budget. Chat history (lowest priority) is the first to be dropped,
keeping the most important context intact.

## Real-World Patterns

### RAG Pipeline

Prioritize the user query and retrieved chunks over boilerplate:

```typescript
const budget = createBudget(8000, [
  { name: 'system', priority: 1, required: true },
  { name: 'retrieved_chunks', priority: 2, maxTokens: 5000 },
  { name: 'query', priority: 3, required: true },
]);
```

### Multi-Turn Chat

Keep recent messages, drop older history first:

```typescript
const budget = createBudget(4000, [
  { name: 'system', priority: 1, required: true },
  { name: 'user_input', priority: 2, required: true },
  { name: 'last_3_messages', priority: 3, maxTokens: 1500 },
  { name: 'older_history', priority: 4, maxTokens: 1000 },
]);
```

### Agent with Tool Results

Tool outputs can be large -- cap them so the task description is never lost:

```typescript
const budget = createBudget(6000, [
  { name: 'system', priority: 1, required: true },
  { name: 'task_description', priority: 2, required: true },
  { name: 'tool_results', priority: 3, maxTokens: 3000 },
  { name: 'scratchpad', priority: 4, maxTokens: 500 },
]);
```

## Install

```bash
npm install github:protectyr-labs/token-budget
```

## Quick Start

```typescript
import { createBudget, allocate } from '@protectyr-labs/token-budget';

const budget = createBudget(4000, [
  { name: 'system', priority: 1, required: true },
  { name: 'context', priority: 2, maxTokens: 1500 },
  { name: 'history', priority: 3, maxTokens: 800 },
]);

const result = allocate(budget, {
  system: systemPrompt,
  context: relevantDocs,
  history: chatHistory,  // dropped first if over budget
});

console.log(result.included);   // ['system', 'context']
console.log(result.dropped);    // ['history']
console.log(result.totalTokens); // 3200
```

## API

### `createBudget(totalTokens, layers, options?)`

Create a budget with named layers sorted by priority (lower number = higher priority).

### `allocate(budget, contents)`

Fit content into the budget. Returns `AllocationResult` with included/dropped layers, contents, and token usage.

### `estimateTokens(text)`

Estimate token count at ~4 chars per token. Zero dependencies, within 10% of tiktoken for English.

### `LayerConfig`

- `name` — layer identifier
- `priority` — lower = higher priority (1 is highest)
- `required` — if true, never dropped regardless of budget
- `maxTokens` — cap this layer's token contribution

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions.

## License

MIT — extracted from Protectyr's production AI pipeline.

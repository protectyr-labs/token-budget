# token-budget

Smart token allocation for multi-layer LLM prompts. Priority-based dropping with enrichment tracing.

## Why This Exists

When building LLM applications with rich context (system prompt, user data, conversation
history, retrieved documents), you quickly hit token limits. The naive approach — truncate
everything proportionally — loses critical context. This library lets you define priority
layers and drops the least important content first, keeping high-priority context intact.

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

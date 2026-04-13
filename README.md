# token-budget

> Priority-based token allocation for LLM prompts.

[![CI](https://github.com/protectyr-labs/token-budget/actions/workflows/ci.yml/badge.svg)](https://github.com/protectyr-labs/token-budget/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()

Your LLM has a context window. Your prompt has layers (system, context, history, docs). This library decides what stays and what gets dropped -- highest priority first.

## Quick Start

```bash
npm install github:protectyr-labs/token-budget
```

```typescript
import { createBudget, allocate } from '@protectyr-labs/token-budget';

const budget = createBudget(500, [
  { name: 'system',   priority: 1, required: true },
  { name: 'context',  priority: 2 },
  { name: 'history',  priority: 3 },
  { name: 'docs',     priority: 4 },
]);

const result = allocate(budget, {
  system:  'You are a helpful assistant...',   // 29 tokens
  context: 'User works at Acme Corp...',       // 125 tokens
  history: chatMessages,                        // 335 tokens -- dropped
  docs:    retrievedChunks,                     // 93 tokens
});

// result.included => ['system', 'context', 'docs']
// result.dropped  => ['history']
// result.totalTokens => 379
```

## Why This?

- **Priority-based dropping** -- full context or none, not truncated everything
- **Required layers never dropped** -- system prompt always fits
- **4-char/token estimator** -- within 10% of tiktoken, zero dependencies
- **Custom estimator support** -- swap in tiktoken when you need precision
- **Per-layer caps** -- `maxTokens` prevents any single layer from dominating

## Use Cases

**RAG pipelines** -- System prompt + retrieved documents + user query. Documents are variable-length. Token budget ensures the system prompt is never dropped, documents get priority 2, and chat history is shed first.

**Multi-turn chat** -- As conversation grows, old messages push you over the context limit. Token budget drops the oldest messages while keeping the system prompt and last few turns.

**Agent tool results** -- An agent calls 5 tools. Their combined output exceeds the context window. Token budget keeps the task description and drops the least-relevant tool results.

## API

| Function | Description |
|----------|-------------|
| `createBudget(totalTokens, layers, options?)` | Define budget with prioritized layers |
| `allocate(budget, contents)` | Fit content into budget; returns included/dropped/tokens |
| `estimateTokens(text)` | ~4 chars/token estimate (English) |

### Layer Config

- `name` -- layer identifier
- `priority` -- lower number = higher priority (1 is highest)
- `required` -- never dropped regardless of budget
- `maxTokens` -- cap this layer's contribution

## Real-World Patterns

- **RAG pipeline** -- prioritize query + retrieved chunks over boilerplate
- **Multi-turn chat** -- keep recent messages, drop older history first
- **Agent with tools** -- cap tool output so the task description is never lost

## Limitations

- **English-optimized** -- CJK languages average ~2 chars/token, not 4
- **All-or-nothing per layer** -- no partial truncation within a layer
- **No model-specific budgets** -- you provide the token limit

## See Also

- [prompt-shield](https://github.com/protectyr-labs/prompt-shield) -- scan untrusted text before it enters your prompt
- [file-preprocess](https://github.com/protectyr-labs/file-preprocess) -- extract text from files for LLM context
- [vector-dedup](https://github.com/protectyr-labs/vector-dedup) -- deduplicate context chunks before budgeting

## License

MIT

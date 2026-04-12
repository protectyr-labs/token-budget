# Architecture

## Problem Context

Our AI pipeline enriches LLM prompts with 5 context layers: application identity,
organization metadata, assessment template, user answers, and historical assessments.
Total context can exceed the model's effective window, degrading output quality.
We needed a way to intelligently shed context without losing critical information.

## Approach

Priority-based allocation: define layers with priorities, include in order, drop
lowest-priority layers when budget is exceeded. Required layers are never dropped.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Proportional truncation | Simple, predictable | Truncates everything equally — loses critical context | A half-truncated system prompt is worse than a full one |
| Exact token counting (tiktoken) | Precise | Adds dependency, slow (~50ms per call), model-specific | 4-char estimate is within 10% for English, zero overhead |
| Dynamic context window selection | Optimal | Requires model-specific logic, complex | YAGNI — priority dropping solves 95% of cases |
| No budget enforcement | Zero overhead | Degraded output when context is too large | Unacceptable for production |

## Key Design Decisions

### Why estimate tokens (4 chars/token) instead of exact counting?
- **Decision:** Use `Math.ceil(text.length / 4)` for estimation.
- **Rationale:** tiktoken adds a dependency, takes ~50ms per call, and is model-specific. The 4:1 ratio is within 10% for English text. For budget enforcement (not billing), 10% accuracy is sufficient.
- **Consequence:** Slightly over-budgets for code/URLs (more tokens per char). Slightly under-budgets for simple English. Acceptable trade-off.

### Why priority-based dropping over proportional shrinking?
- **Decision:** Drop entire layers by priority rather than truncating all layers equally.
- **Rationale:** A complete context layer is more useful than a truncated one. If you have 80% of the system prompt + 80% of history, neither is fully useful. Better to have 100% system + 0% history.
- **Consequence:** Low-priority layers are all-or-nothing. This is intentional.

### Why required layers can't be dropped?
- **Decision:** Layers marked `required: true` are always included, even if they exceed the budget.
- **Rationale:** The system prompt defines model behavior. Dropping it produces unpredictable results. It's better to go slightly over budget than to lose the system prompt.
- **Consequence:** If required layers alone exceed the budget, the result will be over-budget. The caller must handle this (use a larger model or shrink required content).

### Why trace is part of the result?
- **Decision:** `AllocationResult` includes `included`, `dropped`, `totalTokens`, and `budgetLimit`.
- **Rationale:** When debugging "why did the model miss context X?", you need to know which layers were dropped and why. The trace is cheap (just arrays of strings) and enables `AI_DEBUG_TRACE` logging in production.
- **Consequence:** Every allocation returns metadata. No separate "trace mode" needed.

## Known Limitations

- Token estimation is English-optimized (CJK text has ~2 chars per token, not 4)
- No support for truncating within a layer (all-or-nothing per layer)
- No model-specific budgets (caller must know their model's context window)
- Priority is static — no runtime re-prioritization based on content

export interface LayerConfig {
  name: string;
  priority: number; // lower = higher priority (1 is highest)
  required?: boolean;
  maxTokens?: number;
}

export interface BudgetOptions {
  estimator?: (text: string) => number;
}

export interface Budget {
  totalTokens: number;
  layers: LayerConfig[];
  estimator: (text: string) => number;
}

export interface AllocationResult {
  included: string[];
  dropped: string[];
  contents: Record<string, string>;
  totalTokens: number;
  budgetLimit: number;
}

/**
 * Estimate token count from text length.
 * ~4 characters per token is a standard approximation for English text.
 * Within 10% of tiktoken for most inputs, with zero dependencies.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Create a token budget with named layers and priorities.
 */
export function createBudget(
  totalTokens: number,
  layers: LayerConfig[],
  options?: BudgetOptions,
): Budget {
  return {
    totalTokens,
    layers: [...layers].sort((a, b) => a.priority - b.priority),
    estimator: options?.estimator ?? estimateTokens,
  };
}

/**
 * Allocate content into a token budget.
 *
 * Includes layers in priority order (lowest number = highest priority).
 * When the budget is exceeded, drops the lowest-priority non-required
 * layers first. Required layers are always included regardless of budget.
 */
export function allocate(
  budget: Budget,
  contents: Record<string, string>,
): AllocationResult {
  const included: string[] = [];
  const dropped: string[] = [];
  const outputContents: Record<string, string> = {};
  let usedTokens = 0;

  // Calculate token cost for each layer
  const layerCosts: { name: string; tokens: number; required: boolean; content: string }[] = [];
  for (const layer of budget.layers) {
    const content = contents[layer.name] ?? '';
    let tokens = budget.estimator(content);
    if (layer.maxTokens && tokens > layer.maxTokens) {
      tokens = layer.maxTokens;
    }
    layerCosts.push({
      name: layer.name,
      tokens,
      required: layer.required ?? false,
      content,
    });
  }

  // Include layers in priority order, drop when over budget
  for (const layer of layerCosts) {
    if (layer.required) {
      included.push(layer.name);
      outputContents[layer.name] = layer.content;
      usedTokens += layer.tokens;
    } else if (usedTokens + layer.tokens <= budget.totalTokens) {
      included.push(layer.name);
      outputContents[layer.name] = layer.content;
      usedTokens += layer.tokens;
    } else {
      dropped.push(layer.name);
    }
  }

  return {
    included,
    dropped,
    contents: outputContents,
    totalTokens: usedTokens,
    budgetLimit: budget.totalTokens,
  };
}

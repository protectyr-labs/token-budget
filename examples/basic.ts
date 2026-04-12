import { createBudget, allocate, estimateTokens } from '../src/index';

// Scenario: Building a prompt for an AI assistant with limited context window
const systemPrompt = 'You are a helpful customer support agent for Acme Corp. Always be polite and reference the knowledge base when possible.';
const userContext = 'Customer has been a member since 2020. Premium tier. 3 open tickets. Last interaction was about billing.'.repeat(5);
const chatHistory = 'User: I need help with my bill\nAssistant: I\'d be happy to help with billing. Could you share your account ID?\nUser: It\'s ACC-12345\n'.repeat(10);
const retrievedDocs = 'Billing FAQ: Invoices are generated on the 1st of each month. Payment is due within 30 days. Late fees apply after 45 days.'.repeat(3);

console.log('=== Token Budget Demo ===\n');
console.log(`System prompt: ${estimateTokens(systemPrompt)} tokens`);
console.log(`User context: ${estimateTokens(userContext)} tokens`);
console.log(`Chat history: ${estimateTokens(chatHistory)} tokens`);
console.log(`Retrieved docs: ${estimateTokens(retrievedDocs)} tokens`);
console.log(`Total unbudgeted: ${estimateTokens(systemPrompt + userContext + chatHistory + retrievedDocs)} tokens\n`);

// Create budget with priorities
const budget = createBudget(500, [
  { name: 'system', priority: 1, required: true },          // never dropped
  { name: 'user_context', priority: 2, maxTokens: 200 },    // high priority
  { name: 'retrieved_docs', priority: 3, maxTokens: 150 },   // medium priority
  { name: 'chat_history', priority: 4 },                     // dropped first
]);

const result = allocate(budget, {
  system: systemPrompt,
  user_context: userContext,
  retrieved_docs: retrievedDocs,
  chat_history: chatHistory,
});

console.log('Budget: 500 tokens');
console.log(`Included: ${result.included.join(', ')}`);
console.log(`Dropped: ${result.dropped.join(', ')}`);
console.log(`Used: ${result.totalTokens} / ${result.budgetLimit} tokens`);

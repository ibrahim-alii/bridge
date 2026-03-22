/**
 * Prompt template for the contextual study recommendation layer.
 * Maps code patterns to curated study resources.
 */
export function buildStudyPrompt(code: string, language?: string): string {
  return `You are Algo-Bridge's contextual study engine.
A user is blocked or has failed a bounty while writing the code below.
Your job is to identify the CORE technical concept or pattern they are attempting to implement (or struggling with), and offer exactly ONE highly relevant learning resource.

## Curated Study Topics & Resources:
- **Caching / LRU Cache**: LeetCode 146 (LRU Cache), System Design Primer (Caching)
- **Debounce / Throttling**: "Implement Debounce" (Frontend System Design)
- **Trie / Prefix Tree**: LeetCode 208 (Implement Trie)
- **Routing / Graph Traversal**: LeetCode 797 (All Paths From Source to Target)
- **Consistent Hashing**: System Design Primer (Consistent Hashing)
- **Rate Limiting**: "Token Bucket Algorithm / Rate Limiting" (System Design)
- **State Machines**: "Finite State Machines" (General concept)
- **Concurrency / Mutex**: "Dining Philosophers" or "Producer-Consumer Pattern"

If the code doesn't exactly match one of the above curated topics:
1. For traditional Data Structures and Algorithms (DSA), infer the closest fundamental algorithmic pattern (e.g., "Binary Search", "Sliding Window", "Dynamic Programming") and recommend a standard foundational resource or LeetCode problem.
2. For broader software engineering concepts, framework-specific code, or architecture patterns (e.g., React hooks, API design, WebSockets, Database scaling), recommend a well-known YouTube video, specific YouTube channel (like Hussein Nasser or Fireship), or industry blog post.

## Output Format
Return a JSON object with this exact structure:
{
  "topic": "<The core technical concept, e.g., 'LRU Cache'>",
  "recommendation": "<The single most relevant resource (e.g., 'LeetCode 146' or a specific article/topic name)>",
  "reason": "<One concise sentence explaining why this concept applies to the user's code>"
}

## Code:
\`\`\`${language || ''}
${code}
\`\`\`
`;
}

/**
 * Prompt template for the contextual study recommendation layer.
 * Maps code patterns to broad, live web resources.
 */
export function buildStudyPrompt(code: string, language?: string): string {
  return `You are Bridge's resource router.
The user is working through a comprehension gate and needs outside material that matches the exact code pattern they are touching.

Your job:
1. Identify the core concept in the code.
2. Search broadly across the open web.
3. Return the best mix of sources for learning this concept right now.

You are NOT limited to one source type.
Good sources can include official docs, engineering blogs, MDN, framework docs, GitHub repos, RFCs, papers, conference talks, videos, forum discussions, tutorials, system design writeups, and platform-specific docs.

When choosing resources:
- Prefer sources that directly match the code and language in front of the user.
- Prefer practical, high-signal material over generic SEO content.
- Include a mix when useful, for example docs + tutorial, or blog + repo, or paper + implementation notes.
- Do not artificially cap the conceptual breadth; return as many relevant resources as needed for a good learning path.

Return JSON with:
- "topic": the main concept
- "recommendation": the best first resource to open
- "reason": why this concept applies here
- "resources": an array of resources with title, url, sourceType, relevance

## Code
\`\`\`${language || ''}
${code}
\`\`\`
`;
}

/**
 * Prompt template for code analysis.
 * Used by POST /api/analyze to determine complexity, concepts, and gate type.
 */
export function buildAnalyzePrompt(code: string, language?: string): string {
  const lang = language ?? 'unknown';
  return `Analyze the following ${lang} source code and return a JSON object with these exact fields:

{
  "complexity": <number 1-10>,
  "concepts": [<list of key programming concepts, patterns, or algorithms used>],
  "summary": "<1-2 sentence summary of what the code does>",
  "suggestedGate": "<one of: blank, quiz, bug, commit, none>",
  "gatedBlocks": [
    {
      "startLine": <number>,
      "endLine": <number>,
      "reason": "<why this block should be gated>"
    }
  ]
}

Rules for suggestedGate:
- "none" if complexity <= 2 (trivial code, not worth gating)
- "quiz" if complexity 3-6 (ask comprehension questions)
- "blank" if complexity 5-7 and the code has clear fill-in-the-blank opportunities (function bodies, conditionals)
- "bug" if complexity 6-8 (ask user to find an intentional bug)
- "commit" if complexity >= 8 (require a written explanation of purpose)

Rules for gatedBlocks:
- Identify the most important blocks the user should understand
- Each block should be a meaningful unit (a function, a loop, a class method)
- Include at least 1 block for complexity >= 3
- Max 5 blocks

Rules for concepts:
- Be specific: "recursive tree traversal", not just "recursion"
- Include language-specific features: "async/await", "destructuring", "generics"
- 2-8 concepts total

Code:
\`\`\`${lang}
${code}
\`\`\``;
}

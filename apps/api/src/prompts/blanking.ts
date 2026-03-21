/**
 * Prompt template for blanking metadata generation.
 * Identifies which parts of code to hide for fill-in-the-blank exercises.
 */
export function buildBlankingPrompt(code: string, language?: string): string {
  const lang = language ?? 'code';
  return `Analyze the following ${lang} and identify sections that should be blanked out for a fill-in-the-blank comprehension exercise.

Return a JSON object with this exact structure:
{
  "blanks": [
    {
      "startLine": <number>,
      "endLine": <number>,
      "blankType": "<one of: function_body, conditional, loop_body, return_value, expression>",
      "hint": "<a subtle hint about what belongs here, without giving the answer>",
      "expectedPattern": "<a description of what the correct fill-in should contain — NOT the literal code>"
    }
  ],
  "totalBlanks": <number of blanks>,
  "difficulty": "<easy | medium | hard>"
}

Rules:
- Choose 1-3 blanks that test understanding of the code's core logic
- Prefer blanking function bodies, conditional branches, or return statements
- Do NOT blank imports, variable declarations with obvious values, or boilerplate
- The hint should guide thinking without revealing the answer
- expectedPattern describes the SHAPE of the answer: e.g. "a conditional that checks array bounds" not the literal code
- difficulty reflects how hard it would be to fill in the blanks without seeing the original

Code:
\`\`\`${lang}
${code}
\`\`\``;
}

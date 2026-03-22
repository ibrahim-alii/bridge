/**
 * Prompt template for progressive mentor hints.
 * Generates escalating hints that guide without giving away the answer.
 */
export function buildMentorHintPrompt(
  code: string,
  context: string,
  previousHints?: string[],
): string {
  const prevSection = previousHints?.length
    ? `\nThe user has already received these hints (do NOT repeat them):\n${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
    : '';

  return `You are a patient coding mentor. A user is trying to understand the following code and is struggling. Generate progressive hints that guide them toward understanding WITHOUT giving away the answer directly.
${prevSection}
Return a JSON object with this exact structure:
{
  "hints": [
    {
      "level": <1-3, where 1 is vague and 3 is very specific>,
      "hint": "<the hint text>",
      "focusArea": "<which part of the code this hint relates to>"
    }
  ],
  "encouragement": "<a brief encouraging message>"
}

Rules:
- Generate exactly 3 hints with levels 1, 2, and 3
- Level 1 (nudge): Point them in the right direction. "Look at how the loop variable changes..."
- Level 2 (guide): Give more specific guidance. "Notice that the function is called recursively with a modified array..."  
- Level 3 (explain): Nearly explain it, but still require the user to make the final connection. "The base case returns when the array length is 0, but consider what happens to the accumulator..."
- Never say "the answer is X" — always leave the final insight for the user
- Reference specific parts of the code (line numbers, variable names, function names)

The user's current struggle context: "${context}"

Code:
\`\`\`
${code}
\`\`\``;
}

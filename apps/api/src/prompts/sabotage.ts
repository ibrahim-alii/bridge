/**
 * Prompt template for sabotage (intentional bug injection).
 * The LLM introduces subtle, plausible bugs the user must identify.
 */
export function buildSabotagePrompt(code: string, language?: string): string {
  const lang = language ?? 'code';
  return `You are a code saboteur. Take the following ${lang} and introduce exactly ONE subtle, plausible bug. The bug should be the kind a developer might accidentally introduce — NOT an obvious syntax error.

Return a JSON object with this exact structure:
{
  "sabotagedCode": "<the full code with exactly one bug introduced>",
  "originalLine": <the line number of the original code that was changed (1-based)>,
  "originalContent": "<the original line content before sabotage>",
  "sabotagedContent": "<the modified line content with the bug>",
  "bugType": "<one of: off_by_one, wrong_operator, wrong_variable, missing_check, wrong_return, swapped_args, boundary_error>",
  "explanation": "<what the bug does and why it would cause incorrect behavior>",
  "difficulty": "<easy | medium | hard>"
}

Rules for good sabotage:
- off_by_one: Change < to <=, or 0 to 1, or length to length-1
- wrong_operator: && to ||, + to -, === to ==, > to >=
- wrong_variable: Use a similarly-named variable in the wrong place
- missing_check: Remove a null/undefined/bounds check
- wrong_return: Return the wrong value or variable
- swapped_args: Swap the order of function arguments
- boundary_error: Change array bounds or loop limits

The bug MUST:
- Be a single-line change
- Compile without errors
- Cause incorrect runtime behavior (not a crash, if possible)
- Be plausible — something a real developer might accidentally do

Code:
\`\`\`${lang}
${code}
\`\`\``;
}

/**
 * Build a prompt that issues a senior-engineer challenge to the user.
 * It must NOT lecture, and it must NEVER provide the refactored code.
 */
export function buildBountyChallengePrompt(code: string, smellType: string): string {
  return `You are conducting a "Senior Engineering Selective Review Pass".
The user has submitted code that was flagged by heuristics for the following smell: ${smellType}.

Your job is to generate a "Bounty Challenge" that asks the user to refactor the code.

## Rules:
1. Frame the issue as an engaging challenge, not a dry lecture. Example: "I see you're using O(N^2) loops here... can you map that data instead to achieve O(N)?"
2. Provide a "structural hint" that points them in the correct architectural direction.
3. **NEVER provide the actual refactored code.** Do not include any code blocks that provide the answer.

## Original Code:
\`\`\`
${code}
\`\`\`

Return a JSON object with this exact structure:
{
  "challenge": "<The senior-engineer tone challenge text>",
  "hint": "<A structural hint pointing to the solution>"
}`;
}

/**
 * Build a prompt that evaluates the user's refactored code against the original.
 */
export function buildBountyEvaluatePrompt(originalCode: string, refactoredCode: string, smellType: string): string {
  return `You are evaluating a user's attempt to refactor code and resolve a "${smellType}" code smell.

## Original Code:
\`\`\`
${originalCode}
\`\`\`

## User's Refactored Code:
\`\`\`
${refactoredCode}
\`\`\`

## Evaluation Rules:
1. "passed" should be true ONLY IF the user successfully removed the code smell AND preserved the fundamental business logic.
2. Provide concise feedback explaining why they passed or failed.
3. If they failed, provide a gentle hint. If they passed, "hint" can be omitted.

Return a JSON object with this exact structure:
{
  "passed": <boolean>,
  "feedback": "<concise feedback on their approach>",
  "hint": "<optional hint if they failed>"
}`;
}

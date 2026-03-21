/**
 * Prompt templates for LLM-powered analysis, quiz generation, and evaluation.
 *
 * These templates will be used when BRIDGE_MOCK_MODE is false.
 * Each template is a function that accepts context and returns a prompt string.
 */

export const prompts = {
  /** Analyze code for complexity and key concepts */
  analyzeCode: (code: string, language?: string) =>
    `Analyze the following ${language ?? 'code'} and identify:
1. Complexity (1-10)
2. Key concepts used
3. A brief summary
4. Whether the user should be quizzed, asked to fill in blanks, find a bug, or explain a commit

Code:
\`\`\`${language ?? ''}
${code}
\`\`\``,

  /** Generate quiz questions about code */
  generateQuiz: (code: string, concepts: string[]) =>
    `Generate a multiple-choice quiz question about the following code.
Focus on these concepts: ${concepts.join(', ')}.
Provide exactly 4 options, the correct answer index, and an explanation.

Code:
\`\`\`
${code}
\`\`\``,

  /** Evaluate a user's explanation */
  evaluateExplanation: (code: string, explanation: string) =>
    `The user was asked to explain the following code block in plain English.
Rate whether their explanation demonstrates genuine understanding.

Code:
\`\`\`
${code}
\`\`\`

User's explanation:
"${explanation}"

Does this explanation demonstrate understanding? Respond with passed: true/false and feedback.`,
};

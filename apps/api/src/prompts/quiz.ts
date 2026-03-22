/**
 * Prompt template for quiz generation.
 * Used by POST /api/quiz to generate MCQ questions about code.
 */
export function buildQuizPrompt(
  code: string,
  concepts?: string[],
): string {
  const conceptHint = concepts?.length
    ? `Focus your questions on these concepts: ${concepts.join(', ')}.`
    : 'Focus on the most important concepts demonstrated in this code.';

  return `Generate multiple-choice quiz questions that test genuine understanding of the following code. ${conceptHint}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "<clear question about the code's behavior, purpose, or logic>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctIndex": <0-3>,
      "explanation": "<why the correct answer is right, referencing specific code>",
      "difficulty": "<easy | medium | hard>"
    }
  ],
  "passingScore": <number between 0 and 1, e.g. 0.7>
}

Rules:
- Generate 2-3 questions
- Each question MUST have exactly 4 options
- correctIndex is 0-based (0 = first option, 3 = last)
- Questions should test understanding, NOT surface-level syntax recognition
- Good questions: "What happens when X?", "Why does the author use Y?", "What would break if Z?"
- Bad questions: "What keyword is on line 3?", "How many parameters does function F have?"
- Wrong options should be plausible, not obviously absurd
- Difficulty distribution: 1 easy, 1 medium, 1 hard (if 3 questions)
- passingScore should be 0.7 for 3 questions, 1.0 for 1 question, 0.5 for 2

Code:
\`\`\`
${code}
\`\`\``;
}

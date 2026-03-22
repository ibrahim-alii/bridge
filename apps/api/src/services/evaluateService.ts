import type { EvaluateRequest, EvaluateResponse } from '@bridge/contracts';

export const evaluateService = {
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    if (request.scope === 'quiz' && request.quizAnswer) {
      const isCorrect = request.quizAnswer.selectedIndex === request.quizAnswer.correctIndex;
      return {
        passed: isCorrect,
        feedback: isCorrect
          ? 'Correct! You demonstrated understanding of the code.'
          : 'Not quite. Review the explanation provided with the question.',
        attemptsRemaining: isCorrect ? undefined : 2,
      };
    }

    // Default: in the hackathon, other static gate types (like blank/bug)
    // have their own specific evaluate endpoints (/api/blank/evaluate).
    // The generic evaluate endpoint is primarily for quizzes.
    return {
      passed: true,
      feedback: 'Gate unlocked.',
    };
  },
};

import type { EvaluateRequest, EvaluateResponse } from '@bridge/contracts';
import { sessionService } from './session';

export const evaluateService = {
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    if (request.scope === 'quiz' && request.quizAnswer) {
      const metadata = await sessionService.getGateMetadata(request.sessionId, 'quiz');
      if (!metadata || !metadata.quizQuestions) {
        throw new Error('No active quiz found for this session');
      }

      const question = metadata.quizQuestions.find(
        (q: any) => q.questionId === request.quizAnswer!.questionId
      );

      if (!question) {
        throw new Error('Question not found in active quiz');
      }

      const isCorrect = request.quizAnswer.selectedIndex === question.correctIndex;
      return {
        passed: isCorrect,
        feedback: isCorrect
          ? 'Correct! You demonstrated understanding of the code.'
          : 'Not quite. Review the explanation provided with the question.',
        hint: isCorrect ? undefined : question.explanation,
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

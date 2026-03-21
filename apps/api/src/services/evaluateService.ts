import type { EvaluateRequest, EvaluateResponse } from '@bridge/contracts';

export const evaluateService = {
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    // TODO: Replace with LLM-powered evaluation
    // Mock: quiz answers pass if correctIndex matches, others always pass

    if (request.scope === 'quiz' && request.quizAnswer) {
      // In mock mode, the correct answer is always index 2
      const passed = request.quizAnswer.selectedIndex === 2;
      return {
        passed,
        feedback: passed
          ? 'Correct! You demonstrated understanding of the return value behavior.'
          : 'Not quite. Think about what happens when the loop body never executes.',
        hint: passed ? undefined : 'Consider what the initial value of the result variable is.',
        attemptsRemaining: passed ? undefined : 2,
      };
    }

    // Default: pass for other gate types in mock mode
    return {
      passed: true,
      feedback: 'Your explanation demonstrates sufficient understanding. Gate unlocked.',
    };
  },
};

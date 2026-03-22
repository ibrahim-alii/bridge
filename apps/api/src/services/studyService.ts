import Anthropic from '@anthropic-ai/sdk';
import type { StudyRecommendationRequest, StudyRecommendationResponse } from '@bridge/contracts';
import { StudyRecommendationResponseSchema } from '@bridge/contracts';
import { logger } from '@bridge/shared-utils';
import { buildStudyPrompt } from '../prompts';
import { llm } from './llm';

const SEARCH_MODEL = 'claude-sonnet-4-20250514';

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set.');
    }
    anthropic = new Anthropic({ apiKey });
  }

  return anthropic;
}

function parseStudyResponse(text: string): StudyRecommendationResponse {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonText = objectMatch ? objectMatch[0] : cleaned;
  return StudyRecommendationResponseSchema.parse(JSON.parse(jsonText));
}

export const studyService = {
  /**
   * Generates a web-backed study recommendation using broad internet search.
   * Falls back to a model-only recommendation if the search tool is unavailable.
   */
  async getRecommendation(request: StudyRecommendationRequest): Promise<StudyRecommendationResponse> {
    logger.info('studyService: generating recommendation with live web search', {
      codeLength: request.code.length,
      language: request.language,
    });

    const prompt = buildStudyPrompt(request.code, request.language);

    try {
      const response = await getClient().beta.messages.create({
        model: SEARCH_MODEL,
        max_tokens: 1400,
        system:
          'You are a precise JSON generator. Use the available web tools when they improve the answer. Respond with only valid JSON and no markdown.',
        messages: [{ role: 'user', content: prompt }],
        tools: [
          {
            name: 'web_search',
            type: 'web_search_20260209',
            allowed_callers: ['direct'],
          },
          {
            name: 'web_fetch',
            type: 'web_fetch_20260309',
            allowed_callers: ['direct'],
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Study recommendation did not include a text response.');
      }

      return parseStudyResponse(textBlock.text);
    } catch (error) {
      logger.warn('studyService: live web search failed, falling back to model-only recommendation', {
        error,
      });

      return llm.complete(prompt, StudyRecommendationResponseSchema, {
        temperature: 0.2,
      });
    }
  },
};

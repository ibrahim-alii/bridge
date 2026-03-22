import Anthropic from '@anthropic-ai/sdk';
import type { StudyRecommendationRequest, StudyRecommendationResponse, StudyResource } from '@bridge/contracts';
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

function detectTopic(code: string, language?: string): string {
  const lower = code.toLowerCase();
  const lang = (language || '').toLowerCase();

  if (lang === 'python' && lower.includes('__name__') && lower.includes('__main__')) {
    return 'Python module entry points';
  }
  if (lower.includes('useeffect') || lower.includes('jsx') || lower.includes('react')) {
    return 'React component behavior and state flow';
  }
  if (lower.includes('async') || lower.includes('await') || lower.includes('promise')) {
    return 'Asynchronous control flow';
  }
  if (lower.includes('class') && lower.includes('constructor')) {
    return 'Object-oriented design';
  }
  if (lower.includes('map(') || lower.includes('filter(') || lower.includes('reduce(')) {
    return 'Collection transformation patterns';
  }
  if (lower.includes('express') || lower.includes('router')) {
    return 'Express routing and request flow';
  }
  if (lang === 'typescript' || lang === 'javascript') {
    return 'JavaScript and TypeScript code flow';
  }
  if (lang === 'python') {
    return 'Python program structure';
  }

  return 'Code comprehension for the current pattern';
}

function buildFallbackResources(topic: string, language?: string): StudyResource[] {
  const lang = (language || '').toLowerCase();
  const encodedTopic = encodeURIComponent(`${topic} ${language || ''}`.trim());

  const generic: StudyResource[] = [
    {
      title: `${topic} overview`,
      url: `https://www.google.com/search?q=${encodedTopic}`,
      sourceType: 'search',
      relevance: 'A broad starting point to compare multiple explanations and examples.',
    },
    {
      title: `${topic} on GitHub`,
      url: `https://github.com/search?q=${encodedTopic}&type=repositories`,
      sourceType: 'repo',
      relevance: 'Useful for seeing real codebases that use the same concept.',
    },
  ];

  if (lang === 'python') {
    return [
      {
        title: 'Python docs',
        url: 'https://docs.python.org/3/',
        sourceType: 'docs',
        relevance: 'Primary reference for Python language behavior and module execution.',
      },
      {
        title: 'Real Python',
        url: `https://realpython.com/search?q=${encodedTopic}`,
        sourceType: 'tutorial',
        relevance: 'Practical walkthroughs with examples that are usually easier to apply.',
      },
      ...generic,
    ];
  }

  if (lang === 'typescript' || lang === 'javascript') {
    return [
      {
        title: 'MDN Web Docs',
        url: `https://developer.mozilla.org/en-US/search?q=${encodedTopic}`,
        sourceType: 'docs',
        relevance: 'Strong conceptual reference for web platform and JavaScript behavior.',
      },
      {
        title: 'TypeScript Handbook',
        url: 'https://www.typescriptlang.org/docs/',
        sourceType: 'docs',
        relevance: 'Helpful when the code pattern is shaped by types or TS-specific syntax.',
      },
      ...generic,
    ];
  }

  return generic;
}

function buildFallbackRecommendation(request: StudyRecommendationRequest): StudyRecommendationResponse {
  const topic = detectTopic(request.code, request.language);
  const resources = buildFallbackResources(topic, request.language);

  return {
    topic,
    recommendation: resources[0].url,
    reason: `Bridge matched your current code to ${topic.toLowerCase()} and prepared a few solid places to learn it from a docs-first path.`,
    resources,
  };
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
      try {
        return await llm.complete(prompt, StudyRecommendationResponseSchema, {
          temperature: 0.2,
        });
      } catch (fallbackError) {
        logger.warn('studyService: model-only recommendation failed, returning deterministic fallback', {
          error: fallbackError,
        });
        return buildFallbackRecommendation(request);
      }
    }
  },
};

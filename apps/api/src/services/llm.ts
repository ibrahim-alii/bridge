import Anthropic from '@anthropic-ai/sdk';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@bridge/shared-utils';

// ─── Client ────────────────────────────────────────────────────────
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Set it in .env or enable BRIDGE_MOCK_MODE=true.',
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ─── Types ─────────────────────────────────────────────────────────
export interface LLMOptions {
  /** Model to use. Defaults to claude-sonnet-4-20250514. */
  model?: string;
  /** Temperature 0-1. Defaults to 0.3. */
  temperature?: number;
  /** Max tokens in the response. Defaults to 4096. */
  maxTokens?: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// ─── Core ──────────────────────────────────────────────────────────

/**
 * Send a prompt to Claude and parse the JSON response against a Zod schema.
 *
 * Includes one automatic retry: if the first response fails Zod validation,
 * the validation errors are sent back to the model with a corrective prompt.
 */
export async function complete<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: LLMOptions = {},
): Promise<T> {
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 4096;
  const client = getClient();

  const systemPrompt = `You are a precise JSON generator. You MUST respond with ONLY valid JSON — no markdown fences, no comments, no extra text. Your response must be parseable by JSON.parse() directly.`;

  // ── First attempt ──────────────────────────────────────────────
  logger.debug('LLM request', { model, temperature });

  const firstResponse = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const firstText = extractText(firstResponse);
  const firstResult = tryParse(firstText, schema);

  if (firstResult.success) {
    logger.debug('LLM response parsed on first attempt');
    return firstResult.data;
  }

  // ── Retry with validation feedback ─────────────────────────────
  logger.warn('LLM response failed validation, retrying with feedback', {
    errors: firstResult.error,
  });

  const correctionPrompt = `Your previous JSON response had validation errors:\n${firstResult.error}\n\nPlease fix your response and return ONLY valid JSON that satisfies the schema. Here was your previous response:\n${firstText}`;

  const retryResponse = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.1, // Lower temperature for correction
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: firstText },
      { role: 'user', content: correctionPrompt },
    ],
  });

  const retryText = extractText(retryResponse);
  const retryResult = tryParse(retryText, schema);

  if (retryResult.success) {
    logger.debug('LLM response parsed on retry');
    return retryResult.data;
  }

  // Both attempts failed
  logger.error('LLM response failed validation after retry', {
    errors: retryResult.error,
  });
  throw new Error(
    `LLM output failed schema validation after retry: ${retryResult.error}`,
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function extractText(response: Anthropic.Message): string {
  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error(`Unexpected content block type: ${block.type}`);
  }
  return block.text.trim();
}

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function tryParse<T>(text: string, schema: ZodSchema<T>): ParseResult<T> {
  try {
    // Strip markdown code fences if the model wrapped its response
    let cleaned = text;
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleaned);
    const validated = schema.parse(parsed);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        success: false,
        error: err.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      };
    }
    if (err instanceof SyntaxError) {
      return { success: false, error: `Invalid JSON: ${err.message}` };
    }
    return { success: false, error: String(err) };
  }
}

/** Check whether we are in mock mode. */
export function isMockMode(): boolean {
  return process.env.BRIDGE_MOCK_MODE === 'true';
}

export const llm = { complete, isMockMode };

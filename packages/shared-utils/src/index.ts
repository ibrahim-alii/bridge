import { randomUUID } from 'crypto';

/**
 * Generate a new UUID v4.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Create an ISO datetime string for "now + N seconds".
 */
export function expiresIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * Simple structured logger.
 */
export const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    console.log(`[bridge:info] ${msg}`, data ?? ''),
  warn: (msg: string, data?: Record<string, unknown>) =>
    console.warn(`[bridge:warn] ${msg}`, data ?? ''),
  error: (msg: string, data?: Record<string, unknown>) =>
    console.error(`[bridge:error] ${msg}`, data ?? ''),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[bridge:debug] ${msg}`, data ?? '');
    }
  },
};

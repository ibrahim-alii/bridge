import dotenv from 'dotenv';
import path from 'path';
import { logger } from '@bridge/shared-utils';

export interface ApiEnv {
  port: number;
  nodeEnv: string;
  mockMode: boolean;
  anthropicApiKey?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

let loaded = false;
let cachedEnv: ApiEnv | null = null;
let mockMissingWarned = false;

function getEnvPaths(): { apiEnvPath: string; rootEnvPath: string } {
  const apiRoot = path.resolve(__dirname, '..', '..');
  const repoRoot = path.resolve(apiRoot, '..', '..');

  return {
    apiEnvPath: path.resolve(apiRoot, '.env'),
    rootEnvPath: path.resolve(repoRoot, '.env'),
  };
}

function loadEnvFiles(): void {
  if (loaded) {
    return;
  }

  const { apiEnvPath, rootEnvPath } = getEnvPaths();

  // Shell-provided env vars win. api/.env is canonical; root .env is fallback only.
  dotenv.config({ path: apiEnvPath, override: false });
  dotenv.config({ path: rootEnvPath, override: false });

  loaded = true;
}

export function getApiEnv(): ApiEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  loadEnvFiles();

  if (!process.env.PORT) {
    process.env.PORT = '3727';
  }

  const mockModeRaw = process.env.BRIDGE_MOCK_MODE;
  if (!mockModeRaw) {
    throw new Error(
      'Missing required env var: BRIDGE_MOCK_MODE. Set BRIDGE_MOCK_MODE=true for mock mode or BRIDGE_MOCK_MODE=false for live mode.',
    );
  }

  if (mockModeRaw !== 'true' && mockModeRaw !== 'false') {
    throw new Error(
      `Invalid BRIDGE_MOCK_MODE value "${mockModeRaw}". Expected "true" or "false".`,
    );
  }

  const parsedPort = Number(process.env.PORT);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value "${process.env.PORT}". Expected an integer between 1 and 65535.`);
  }

  const mockMode = mockModeRaw === 'true';
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!mockMode) {
    const missing: string[] = [];
    if (!anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY');

    if (missing.length > 0) {
      throw new Error(
        `Missing required env vars for live mode (BRIDGE_MOCK_MODE=false): ${missing.join(', ')}.`,
      );
    }
  } else if (!mockMissingWarned) {
    const missingLive: string[] = [];
    if (!anthropicApiKey) missingLive.push('ANTHROPIC_API_KEY');
    if (!supabaseUrl) missingLive.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingLive.push('SUPABASE_SERVICE_KEY');

    if (missingLive.length > 0) {
      logger.warn(
        `Mock mode enabled. Live-service env vars are optional and currently missing: ${missingLive.join(', ')}.`,
      );
    }
    mockMissingWarned = true;
  }

  cachedEnv = {
    port: parsedPort,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mockMode,
    anthropicApiKey,
    supabaseUrl,
    supabaseServiceKey,
  };

  return cachedEnv;
}


import * as vscode from 'vscode';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3727/api';

export function getApiBaseUrl(): string {
  const configured = vscode.workspace
    .getConfiguration('bridge')
    .get<string>('apiBaseUrl', DEFAULT_API_BASE_URL)
    .trim();

  return configured.replace(/\/+$/, '');
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function bridgeFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = getApiUrl(path);

  try {
    return await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Bridge API is unreachable at ${getApiBaseUrl()}. Start the backend or update bridge.apiBaseUrl in VS Code settings.`,
    );
  }
}

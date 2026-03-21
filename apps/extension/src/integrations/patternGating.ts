/**
 * Pattern gating for Bridge.
 *
 * Responsibilities:
 * - Identify key patterns in generated code (function bodies, class methods)
 * - Blank out core logic and require user to fill it in
 * - Work with tree-sitter AST when available, fall back to regex patterns
 */

import { logger } from '@bridge/shared-utils';

/**
 * Identifies code blocks suitable for pattern gating (blanking).
 * Uses simple heuristics for the hackathon; tree-sitter integration later.
 */
export function identifyBlankableBlocks(
  code: string,
  _language: string,
): Array<{ startLine: number; endLine: number; blockType: string }> {
  // TODO: Replace with tree-sitter AST analysis
  // For now, use simple regex to find function bodies

  const lines = code.split('\n');
  const blocks: Array<{ startLine: number; endLine: number; blockType: string }> = [];

  // Simple heuristic: find function declarations with bodies > 3 lines
  let braceDepth = 0;
  let blockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/) && line.includes('{')) {
      blockStart = i + 1;
      braceDepth = 1;
    } else if (blockStart >= 0) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      if (braceDepth === 0) {
        if (i - blockStart > 2) {
          blocks.push({
            startLine: blockStart + 1,
            endLine: i + 1,
            blockType: 'function-body',
          });
        }
        blockStart = -1;
      }
    }
  }

  logger.debug('Identified blankable blocks', { count: blocks.length });
  return blocks;
}

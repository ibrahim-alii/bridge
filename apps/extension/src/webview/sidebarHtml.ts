import type { SessionState } from '@bridge/contracts';
import { SIDEBAR_STYLES } from './styles';
import { renderSidebarBody } from './bodyHtml';
import { CLIENT_SCRIPT } from './clientScript';

export function buildSidebarHtml(state: SessionState | null): string {
  const body = renderSidebarBody(state);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bridge</title>
  <style>${SIDEBAR_STYLES}</style>
</head>
<body>
  ${body}
  <script>${CLIENT_SCRIPT}</script>
</body>
</html>`;
}

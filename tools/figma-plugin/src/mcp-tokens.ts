import { exportTokensText } from './core/export-tokens';
import type { McpFile } from './mcp-entry';
import { TOKENS_PATH } from './plugin-config';
import { sha256Hex, utf8Encode } from './sha256';

// 피그마 MCP(use_figma)에서 tokens.json을 만드는 진입점. 플러그인과 같은 토큰 변환 코드를 쓴다.
// build.mjs가 dist/use-figma-tokens.js(전역 SeojaewanFigmaTokens)로 묶는다.

/**
 * Variables와 스타일을 읽어 tokens.json 파일을 만든다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @returns tokens.json 파일과 토큰으로 옮기지 않은 칠 스타일
 */
export async function runMcpTokens(): Promise<{ file: McpFile; skippedStyles: string[] }> {
  const tokens = await exportTokensText();
  return {
    file: {
      path: TOKENS_PATH,
      encoding: 'utf8',
      content: tokens.text,
      sha256: sha256Hex(utf8Encode(tokens.text)),
    },
    skippedStyles: tokens.skippedStyles,
  };
}

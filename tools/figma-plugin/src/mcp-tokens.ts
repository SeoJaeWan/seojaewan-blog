import { exportTokensText } from './core/export-tokens';
import type { McpFile } from './mcp-entry';
import { assetFilePath } from './naming';
import { TOKENS_PATH } from './plugin-config';
import { sha256Hex, utf8Encode } from './sha256';

// 피그마 MCP(use_figma)에서 tokens.json을 만드는 진입점. 플러그인과 같은 토큰 변환 코드를 쓴다.
// build.mjs가 dist/use-figma-tokens.js(전역 SeojaewanFigmaTokens)로 묶는다.

/**
 * Variables와 스타일을 읽어 tokens.json 파일과, 토큰의 이미지 칠이 가리키는 이미지 자산 파일을 만든다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @returns tokens.json과 이미지 자산 파일, 토큰으로 옮기지 않은 칠 스타일
 */
export async function runMcpTokens(): Promise<{ files: McpFile[]; skippedStyles: string[] }> {
  const tokens = await exportTokensText();
  const files: McpFile[] = [
    {
      path: TOKENS_PATH,
      encoding: 'utf8',
      content: tokens.text,
      sha256: sha256Hex(utf8Encode(tokens.text)),
    },
  ];
  for (const [file, bytes] of tokens.images) {
    files.push({
      path: assetFilePath(file),
      encoding: 'base64',
      content: figma.base64Encode(bytes),
      sha256: sha256Hex(bytes),
    });
  }
  return { files, skippedStyles: tokens.skippedStyles };
}

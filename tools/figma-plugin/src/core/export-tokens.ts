import { buildDesignTokens } from '../design-tokens';
import { readDesignTokensInput } from '../figma-reader';
import { stableStringify } from '../stable-json';

/**
 * Variables와 글자·효과·칠 스타일을 읽어 tokens.json 내용을 만든다. 플러그인과 피그마 MCP가 함께 쓴다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @returns tokens.json 문자열과 토큰으로 옮기지 않은 칠 스타일 이름
 */
export async function exportTokensText(): Promise<{ text: string; skippedStyles: string[] }> {
  const { tokens, skippedStyles } = buildDesignTokens(await readDesignTokensInput());
  return { text: stableStringify(tokens), skippedStyles: [...skippedStyles] };
}

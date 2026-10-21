import { buildDesignTokens } from '../design-tokens';
import { readDesignTokensInput, readImageAssets } from '../figma-reader';
import { stableStringify } from '../stable-json';
import { rasterBytes } from './export-component';

/** tokens.json 내보내기 결과 */
export type TokensExport = {
  /** tokens.json 내용 */
  text: string;
  /** 토큰으로 옮기지 않은 칠 스타일 이름 */
  skippedStyles: string[];
  /** 토큰의 이미지 칠이 가리키는 이미지 자산 파일(`images/noise-acrylic.png`) → 바이트(G4) */
  images: Map<string, Uint8Array>;
};

/**
 * Variables와 글자·효과·칠 스타일을 읽어 tokens.json 내용을 만든다. 플러그인과 피그마 MCP가 함께 쓴다.
 * 이미지 칠은 이름 있는 이미지 자산을 가리키고, 그 자산 파일도 함께 돌려준다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @returns tokens.json 문자열, 토큰으로 옮기지 않은 칠 스타일 이름, 이미지 자산
 */
export async function exportTokensText(): Promise<TokensExport> {
  const input = await readDesignTokensInput();
  const { tokens, skippedStyles } = buildDesignTokens(input);
  const assets = await readImageAssets();
  const images = new Map<string, Uint8Array>();
  for (const style of input.paintStyles) {
    if (skippedStyles.includes(style.name)) {
      continue;
    }
    for (const paint of style.paints) {
      if (paint.type !== 'IMAGE' || paint.imageHash === null) {
        continue;
      }
      const asset = assets.get(paint.imageHash);
      if (asset !== undefined && !images.has(asset.file)) {
        images.set(asset.file, await rasterBytes(asset.node));
      }
    }
  }
  return { text: stableStringify(tokens), skippedStyles: [...skippedStyles], images };
}

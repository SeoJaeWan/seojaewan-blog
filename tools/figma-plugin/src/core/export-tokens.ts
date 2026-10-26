import { tokensJsonToCss } from '../../../../packages/design-system/scripts/tokens/tokens-css';
import { buildDesignTokens } from '../design-tokens';
import { readDesignTokensInput, readImageAssets, readUsageInput } from '../figma-reader';
import { assetFile } from '../naming';
import { stableStringify } from '../stable-json';
import { unusedNotices } from '../unused-tokens';
import { rasterAsset } from './export-component';

/** tokens.json 내보내기 결과 */
export type TokensExport = {
  /** tokens.json 내용 */
  text: string;
  /** tokens.json에서 변환 함수로 만든 tokens.css 내용 */
  css: string;
  /** 토큰으로 옮기지 않은 칠 스타일 이름 */
  skippedStyles: string[];
  /** 토큰의 이미지 칠이 가리키는 이미지 자산 파일(`images/<자산>.<실제 형식의 확장자>`) → 바이트 */
  images: Map<string, Uint8Array>;
  /** 막지 않는 알림: 블렌드 층의 날값 색, 쓰는 곳이 없는 변수·스타일 */
  notices: string[];
};

/**
 * Variables와 글자·효과·칠 스타일을 읽어 tokens.json 내용을 만들고, 변환 스크립트와 같은 함수(tokensJsonToCss)로
 * tokens.css를 만든다. 플러그인과 피그마 MCP가 함께 쓴다.
 * 이미지 칠은 이름 있는 이미지 자산을 가리키고, 그 자산 파일도 함께 돌려준다.
 * 쓰는 곳이 없는 변수·스타일은 알림으로 함께 돌려준다(막지 않음).
 * 변환 규칙에 맞지 않는 토큰이 있으면 tokensJsonToCss가 경로와 이유를 담아 실패한다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @returns tokens.json과 tokens.css 문자열, 토큰으로 옮기지 않은 칠 스타일 이름, 이미지 자산, 알림
 */
export async function exportTokensText(): Promise<TokensExport> {
  const input = await readDesignTokensInput();
  const { tokens, skippedStyles, notices: tokenNotices } = buildDesignTokens(input);
  const assets = await readImageAssets();
  const images = new Map<string, Uint8Array>();
  const exportedNames = new Set<string>();
  for (const style of input.paintStyles) {
    if (skippedStyles.includes(style.name)) {
      continue;
    }
    for (const paint of style.paints) {
      if (paint.type !== 'IMAGE' || paint.imageHash === null) {
        continue;
      }
      const asset = assets.get(paint.imageHash);
      if (asset !== undefined && !exportedNames.has(asset.name)) {
        exportedNames.add(asset.name);
        const raster = await rasterAsset(asset.node);
        images.set(assetFile(asset.name, raster.extension), raster.bytes);
      }
    }
  }
  const notices = [...tokenNotices, ...unusedNotices(await readUsageInput())];
  const text = stableStringify(tokens);
  return {
    text,
    css: tokensCssText(text),
    skippedStyles: [...skippedStyles],
    images,
    notices,
  };
}

/**
 * tokens.json 내용으로 tokens.css 내용을 만든다. 변환 스크립트(`generate:tokens`)와 같은 함수를 써서,
 * 플러그인이 커밋한 tokens.css가 CI가 다시 만든 것과 같다.
 * @codocs [[피그마 연동:토큰 검사]]
 * @param text tokens.json 내용
 * @returns tokens.css 내용
 */
export function tokensCssText(text: string): string {
  const json: unknown = JSON.parse(text);
  return tokensJsonToCss(json);
}

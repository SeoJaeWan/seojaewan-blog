import { buildDesignTokens } from '../design-tokens';
import { readDesignTokensInput, readUsageInput } from '../figma-reader';
import { stableStringify } from '../stable-json';
import { unusedNotices } from '../unused-tokens';

/**
 * tokens.json 내보내기 결과.
 * - text: tokens.json 내용
 * - skippedStyles: 토큰으로 옮기지 않은 칠 스타일 이름
 * - notices: 막지 않는 알림(블렌드 층의 날값 색, 쓰는 곳이 없는 변수·스타일)
 */
export type TokensExport = {
  text: string;
  skippedStyles: string[];
  notices: string[];
};

/**
 * tokens.json 내용만 만든다. 사용처 알림은 만들지 않아 가볍다. 플러그인을 열 때 `main`의 tokens.json과 비교하는 데 쓴다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @returns tokens.json 내용
 */
export async function tokensJsonText(): Promise<string> {
  const { tokens } = buildDesignTokens(await readDesignTokensInput());
  return stableStringify(tokens);
}

/**
 * Variables와 글자·효과·칠 스타일을 읽어 tokens.json 내용을 만든다. tokens.css는 만들지 않는다(CI가 생성한다).
 * 쓰는 곳이 없는 변수·스타일은 알림으로 함께 돌려준다(막지 않음). 규칙에 맞지 않는 토큰이 있으면 이유를 모아 실패한다.
 * @codocs [[디자인 시스템:토큰 생성]]
 * @codocs [[디자인 시스템:토큰 검사]]
 * @returns tokens.json 문자열, 토큰으로 옮기지 않은 칠 스타일 이름, 알림
 */
export async function exportTokensText(): Promise<TokensExport> {
  const { tokens, skippedStyles, notices } = buildDesignTokens(await readDesignTokensInput());
  return {
    text: stableStringify(tokens),
    skippedStyles: [...skippedStyles],
    notices: [...notices, ...unusedNotices(await readUsageInput())],
  };
}

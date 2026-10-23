/**
 * main 병합 뒤 캡처를 parity-captures 브랜치에 어떻게 둘지 정한다. git을 부르지 않는 순수 함수다.
 * 플러그인 PR 본문의 "현재 구현" 열이 `parity-captures/<컴포넌트>/<변형>.png`를 읽는다.
 */

import type { CaptureRow } from './parity-summary.ts';

/** 캡처를 저장하는 브랜치 */
export const CAPTURES_BRANCH = 'parity-captures';

/** parity-captures에 쓸 것 */
export type CapturePublishPlan = {
  /** 브랜치 기준 경로(`button/style=accent,state=rest.png`) → parity-results 기준 코드 캡처 경로 */
  files: Map<string, string>;
  /** 폴더를 비우고 다시 쓰는 컴포넌트. 모든 변형을 캡처했을 때만 비워, 사라진 변형의 캡처를 지운다 */
  replaced: string[];
};

/**
 * 캡처 표 줄에서 parity-captures에 쓸 파일을 정한다. 플러그인 표의 줄은 변형이므로 BOOLEAN 경우는 넣지 않는다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 * @param rows 캡처 표 줄
 * @returns 쓸 파일과 다시 쓰는 컴포넌트
 */
export function capturePublishPlan(rows: readonly CaptureRow[]): CapturePublishPlan {
  const files = new Map<string, string>();
  const replaced: string[] = [];
  const variantRows = rows.filter((row) => !row.isCase);
  for (const component of new Set(variantRows.map((row) => row.component))) {
    const own = variantRows.filter((row) => row.component === component);
    for (const row of own) {
      if (row.code !== null) {
        files.set(`${component}/${row.baseVariant}.png`, row.code);
      }
    }
    if (own.every((row) => row.code !== null)) {
      replaced.push(component);
    }
  }
  return { files, replaced };
}

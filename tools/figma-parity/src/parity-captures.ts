/**
 * main 병합 뒤 코드 캡처를 parity-captures 브랜치에 어떻게 둘지 정한다. git을 부르지 않는 순수 함수다.
 * 플러그인 PR 본문의 "현재 구현" 열이 `parity-captures/<컴포넌트>/<변형>.png`와
 * `parity-captures/patterns/<영역>/<이름>/<변형>.png`를 읽는다.
 * PR의 조립 캡처는 같은 경로에서 이전 코드 그림을 읽는다.
 */

import type { CaptureRow } from './results.ts';

/** 캡처를 저장하는 브랜치 */
export const CAPTURES_BRANCH = 'parity-captures';
/** 조립의 이전 코드 그림을 읽는 기본 참조. CI의 checkout(`fetch-depth: 0`)은 모든 브랜치를 받아 둔다 */
export const DEFAULT_PREVIOUS_REF = `origin/${CAPTURES_BRANCH}`;

/** parity-captures에 쓸 것 */
export type CapturePublishPlan = {
  /** 브랜치 기준 경로(`button/style=accent,state=rest.png`) → 결과 폴더 기준 코드 캡처 경로 */
  files: Map<string, string>;
  /** 폴더를 비우고 다시 쓰는 대상. 모든 변형을 캡처했을 때만 비워, 사라진 변형의 캡처를 지운다 */
  replaced: string[];
};

/**
 * 변형 하나의 코드 캡처가 parity-captures 안에 놓이는 경로를 구한다. 대상 폴더는 대상 이름이다.
 * 병합 때 이 경로에 쓰고, PR의 조립 캡처는 이 경로에서 이전 코드 그림을 읽는다.
 * @codocs [[피그마 연동:CI]]
 * @param target 대상 이름(`button`, `patterns/menu/folder`)
 * @param variant 변형 파일 이름
 * @returns 브랜치 기준 경로
 */
export function capturePath(target: string, variant: string): string {
  return `${target}/${variant}.png`;
}

/**
 * 캡처 표 줄에서 parity-captures에 쓸 파일을 정한다. 대상 폴더는 대상 이름(`button`, `patterns/menu/folder`)이다.
 * @codocs [[피그마 연동:CI]]
 * @param rows 캡처 표 줄
 * @returns 쓸 파일과 다시 쓰는 대상
 */
export function capturePublishPlan(rows: readonly CaptureRow[]): CapturePublishPlan {
  const files = new Map<string, string>();
  const replaced: string[] = [];
  for (const target of new Set(rows.map((row) => row.target))) {
    const own = rows.filter((row) => row.target === target);
    for (const row of own) {
      if (row.code !== null) {
        files.set(capturePath(target, row.variant), row.code);
      }
    }
    if (own.every((row) => row.code !== null)) {
      replaced.push(target);
    }
  }
  return { files, replaced };
}

/**
 * main 병합 뒤 코드 캡처를 parity-captures 브랜치에 어떻게 둘지 정한다. git을 부르지 않는 순수 함수다.
 * 플러그인 PR 본문의 "현재 구현" 열이 `parity-captures/<컴포넌트>/<변형>.png`와
 * `parity-captures/patterns/<영역>/<이름>/<변형>.png`를 읽는다.
 * PR의 조립 캡처는 같은 경로에서 이전 코드 그림을 읽고, 그 커밋은 merge-base 기준으로 고른다.
 */

import type { CaptureRow } from './results.ts';

/** 캡처를 저장하는 브랜치 */
export const CAPTURES_BRANCH = 'parity-captures';
/** 조립의 이전 코드 그림을 읽는 기본 참조. CI의 checkout(`fetch-depth: 0`)은 모든 브랜치를 받아 둔다 */
export const DEFAULT_PREVIOUS_REF = `origin/${CAPTURES_BRANCH}`;

// 병합 때 parity-captures에 남기는 커밋 메시지. 뒤의 SHA(앞 7자리)는 캡처한 main 커밋이다.
const CAPTURE_SUBJECT_PREFIX = 'chore: update parity captures for ';
const CAPTURE_SUBJECT_PATTERN = /^chore: update parity captures for ([0-9a-f]{7,40})$/u;

/**
 * parity-captures 이력의 커밋 하나.
 * - commit: parity-captures 커밋 SHA
 * - subject: 커밋 메시지 첫 줄
 */
export type CaptureHistoryEntry = {
  commit: string;
  subject: string;
};

/**
 * 병합 때 parity-captures에 남기는 커밋 메시지를 만든다.
 * @codocs [[피그마 연동:CI]]
 * @param mainCommit 캡처한 main 커밋 SHA
 * @returns 커밋 메시지
 */
export function captureCommitSubject(mainCommit: string): string {
  return `${CAPTURE_SUBJECT_PREFIX}${mainCommit.slice(0, 7)}`;
}

/**
 * parity-captures 커밋 메시지에서 캡처한 main 커밋을 읽는다.
 * @param subject 커밋 메시지 첫 줄
 * @returns main 커밋 SHA(앞부분). 이 형식이 아니면 undefined
 */
export function capturedMainCommit(subject: string): string | undefined {
  return CAPTURE_SUBJECT_PATTERN.exec(subject.trim())?.[1];
}

/**
 * 조립의 이전 코드 그림을 읽을 parity-captures 커밋을 고른다. 커밋 메시지의 main 커밋이 PR의 merge-base이거나
 * 그 조상인 커밋 가운데 가장 최근 것이다. 병합 캡처는 범위 안 대상만 덮어쓰므로 그 커밋의 그림이 merge-base 시점의 그림이다.
 * @codocs [[피그마 연동:CI]]
 * @param history parity-captures 이력(최근 것부터)
 * @param isMergeBaseOrAncestor main 커밋이 merge-base이거나 그 조상인지
 * @returns 고른 parity-captures 커밋. 맞는 커밋이 없으면 undefined
 */
export function selectPreviousCapture(
  history: readonly CaptureHistoryEntry[],
  isMergeBaseOrAncestor: (mainCommit: string) => boolean,
): string | undefined {
  return history.find((entry) => {
    const main = capturedMainCommit(entry.subject);
    return main !== undefined && isMergeBaseOrAncestor(main);
  })?.commit;
}

/**
 * parity-captures에 쓸 것.
 * - files: 브랜치 기준 경로(`button/style=accent,state=rest.png`) → 결과 폴더 기준 코드 캡처 경로
 * - replaced: 폴더를 비우고 다시 쓰는 대상. 모든 변형을 캡처했을 때만 비워, 사라진 변형의 캡처를 지운다
 */
export type CapturePublishPlan = {
  files: Map<string, string>;
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

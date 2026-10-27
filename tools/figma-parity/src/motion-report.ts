/**
 * 모션 검사 결과(견본마다 `parity-results/motion/<이름>.json`)로 PR 댓글 본문을 만든다. GitHub를 부르지 않는 순수 함수다.
 * 견본마다 `키프레임 | 속성 | 피그마 | 코드 | 결과` 표를 두고, 시간 검사 오류도 함께 적는다.
 */

import {
  ANGLE_TOLERANCE,
  isFailedRow,
  LENGTH_TOLERANCE,
  RATIO_TOLERANCE,
  type ValueRow,
} from './motion-values.ts';
import { escapeMarkdown, paginate } from './pr-comment.ts';

/** 견본 하나의 모션 검사 결과 */
export type MotionResult = {
  /** 견본 이름 */
  name: string;
  /** 피그마 견본 링크 */
  url: string;
  /** 키프레임 값 검사 결과 */
  rows: ValueRow[];
  /** 모션 시간 검사 오류(시간·이징·지연·반복 횟수) */
  timingErrors: string[];
  /** 검사하지 못한 이유(스토리 없음, 애니메이션 없음 등) */
  error: string | null;
};

/** 모션 검사 댓글을 찾는 숨은 표시. 캡처 표 댓글(`figma-parity`)과 따로 고친다 */
export const MOTION_COMMENT_MARKER = 'motion-check';
const tableHeader = ['| 키프레임 | 속성 | 피그마 | 코드 | 결과 |', '|---|---|---|---|---|'];

/**
 * 견본 결과가 실패인지 본다.
 * @param result 견본 결과
 * @returns 시간 오류, 다른 값, 검사하지 못한 이유가 있으면 true
 */
export function isFailedMotion(result: MotionResult): boolean {
  return result.error !== null || result.timingErrors.length > 0 || result.rows.some(isFailedRow);
}

/**
 * 견본 결과로 댓글 본문 목록을 만든다. 각 본문은 순서 번호가 든 숨은 표시로 시작한다.
 * @codocs [[피그마 연동:CI]]
 * @param results 견본 결과(이름 순)
 * @param runUrl 이 실행(Actions run) 주소
 * @returns 댓글 본문 목록
 */
export function renderMotionComments(results: readonly MotionResult[], runUrl: string): string[] {
  const unavailable = results.filter((result) => result.error !== null);
  const different = results.filter((result) => result.error === null && isFailedMotion(result));
  const counts = [
    ...(different.length > 0 ? [`다름 ${String(different.length)}개`] : []),
    ...(unavailable.length > 0 ? [`검사 불가 ${String(unavailable.length)}개`] : []),
  ];
  const header = [
    `모션 검사: 견본 ${String(results.length)}개` +
      (results.length === 0
        ? ', 결과 없음'
        : counts.length > 0
          ? `, ${counts.join(', ')}`
          : ', 모두 같음'),
    `키프레임 값은 투명도·배율·경로 트림 ${String(RATIO_TOLERANCE)}, 이동 ${String(LENGTH_TOLERANCE)}px, 회전 ${String(ANGLE_TOLERANCE)}° 안의 차이를 같다고 본다. ` +
      '실행 중 값(토큰이 아닌 CSS 변수)은 값 대신 그 자리에 변수를 쓰는지와 부호만 본다.',
  ].join('\n');
  const blocks = results.map(motionBlock);
  if (results.length === 0) {
    blocks.push('모션 검사 결과가 없다. 실행 결과에서 빌드나 검사 단계를 확인한다');
  }
  return paginate(header, blocks, `[실행 결과](${runUrl})`, {
    marker: MOTION_COMMENT_MARKER,
    tableHeader,
  });
}

/**
 * 견본 하나의 블록을 쓴다. 다른 곳이 있는 견본은 펼치고, 모두 같은 견본은 접는다.
 * @param result 견본 결과
 * @returns 블록
 */
function motionBlock(result: MotionResult): string {
  const failedRows = result.rows.filter(isFailedRow).length;
  const isFailed = isFailedMotion(result);
  const errors = [
    ...(result.error !== null ? ['검사 불가'] : []),
    ...(failedRows > 0 ? [`키프레임 값 다름 ${String(failedRows)}곳`] : []),
    ...(result.timingErrors.length > 0
      ? [`시간 오류 ${String(result.timingErrors.length)}개`]
      : []),
  ];
  const summary = isFailed ? `❌ ${result.name} (${errors.join(', ')})` : `✅ ${result.name}`;
  const lines = [`<details${isFailed ? ' open' : ''}><summary>${summary}</summary>`, ''];
  if (result.url !== '') {
    lines.push(`[피그마 견본](${result.url})`, '');
  }
  if (result.error !== null) {
    lines.push(`검사하지 못했다: ${escapeMarkdown(result.error)}`, '');
  }
  if (result.timingErrors.length > 0) {
    lines.push(
      '시간 검사:',
      ...result.timingErrors.map((error) => `- ${escapeMarkdown(error)}`),
      '',
    );
  }
  if (result.rows.length > 0) {
    lines.push(...tableHeader, ...result.rows.map(rowLine), '');
  }
  lines.push('</details>');
  return lines.join('\n');
}

/**
 * 결과 표 한 줄을 쓴다.
 * @param row 결과 표 줄
 * @returns 표 줄
 */
function rowLine(row: ValueRow): string {
  const cells = [row.keyframe, row.property, row.figma, row.code, statusText(row)];
  return `| ${cells.map((cell) => escapeMarkdown(cell)).join(' | ')} |`;
}

/**
 * 결과 칸 글을 만든다.
 * @param row 결과 표 줄
 * @returns 결과 글
 */
export function statusText(row: ValueRow): string {
  const note = row.note === '' ? '' : `: ${row.note}`;
  switch (row.status) {
    case 'same':
      return '같음';
    case 'runtime':
      return '실행 중 값(부호 같음)';
    case 'different':
      return `다름${note}`;
    case 'missing':
      return `비교 못 함${note}`;
  }
}

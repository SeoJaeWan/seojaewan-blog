import { describe, expect, it } from 'vitest';

import {
  CAPTURE_ROWS_PER_TABLE,
  COMMENT_LIMIT,
  markerIndex,
  renderComments,
} from './pr-comment.ts';
import type { CaptureRow } from './results.ts';

const commentOptions = {
  runUrl: 'https://github.com/o/r/actions/runs/1',
  imageUrl: (file: string): string => `https://img/${file}`,
};

/**
 * 테스트용 캡처 표 줄을 만든다.
 * @param target 대상
 * @param variant 변형
 * @param change 바꿀 필드
 * @returns 캡처 표 줄
 */
function row(target: string, variant: string, change: Partial<CaptureRow> = {}): CaptureRow {
  const dir = `${target}/${variant}`;
  return {
    target,
    name: target,
    variant,
    figma: `${dir}/figma.png`,
    code: `${dir}/code.png`,
    diff: `${dir}/diff.png`,
    error: null,
    ...change,
  };
}

// @codocs [[피그마 연동:캡처 표]]
describe('PR 댓글 캡처 표', () => {
  it('대상마다 변형 줄에 피그마 | 코드 | 차이 그림을 놓는다', () => {
    const { bodies, images } = renderComments(
      { rows: [row('button', 'state=rest', { name: 'Button' })], fileErrors: [] },
      commentOptions,
    );
    const body = bodies[0] ?? '';
    expect(body).toContain('피그마 캡처 표: 대상 1개, 변형 1개');
    expect(body).toContain('<details open><summary>Button (1개)</summary>');
    expect(body).toContain('| 변형 | 피그마 | 코드 | 차이 |');
    expect(body).toContain(
      '| `state=rest` | <img src="https://img/button/state=rest/figma.png" alt="피그마"> | <img src="https://img/button/state=rest/code.png" alt="코드"> | <img src="https://img/button/state=rest/diff.png" alt="차이"> |',
    );
    expect(images).toEqual([
      'button/state=rest/figma.png',
      'button/state=rest/code.png',
      'button/state=rest/diff.png',
    ]);
  });

  it('캡처하지 못한 줄은 이유를 쓰고 실패 개수를 머리에 쓴다', () => {
    const { bodies } = renderComments(
      {
        rows: [
          row('button', 'state=rest', {
            figma: null,
            code: null,
            diff: null,
            error: '스토리가 없다',
          }),
        ],
        fileErrors: [],
      },
      commentOptions,
    );
    expect(bodies[0]).toContain('캡처 실패 1개');
    expect(bodies[0]).toContain('캡처 실패: 스토리가 없다');
  });

  it('대상 폴더 오류를 쓴다', () => {
    const { bodies } = renderComments(
      { rows: [], fileErrors: ['packages/design-system/figma/components/button/x.png이 없다'] },
      commentOptions,
    );
    expect(bodies[0]).toContain('- packages/design-system/figma/components/button/x.png이 없다');
  });

  it('줄이 많으면 표를 나누고 나뉜 표마다 머리를 다시 쓴다', () => {
    const rows = Array.from({ length: CAPTURE_ROWS_PER_TABLE + 1 }, (_, index) =>
      row('search-box', `state=s${String(index)}`),
    );
    const all = renderComments({ rows, fileErrors: [] }, commentOptions).bodies.join('\n');
    expect(all.split('| 변형 | 피그마 | 코드 | 차이 |')).toHaveLength(3);
    expect(all).toContain(`<details open><summary>search-box (계속) (${String(rows.length)}개)`);
  });
});

// @codocs [[피그마 연동:CI]]
describe('PR 댓글 길이', () => {
  it('길이 제한을 넘으면 번호를 붙인 댓글로 이어 쓴다', () => {
    const rows = Array.from({ length: 600 }, (_, index) =>
      row('button', `style=accent,state=s${String(index)},show-icon=true`),
    );
    const { bodies, images } = renderComments({ rows, fileErrors: [] }, commentOptions);
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(bodies.map(markerIndex)).toEqual(bodies.map((_, index) => index + 1));
    expect(images).toHaveLength(1800);
  });
});

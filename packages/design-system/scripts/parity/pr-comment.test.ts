// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { CaptureRow, ParitySummary, VariantResult } from './parity-summary.ts';
import {
  CAPTURE_ROWS_PER_TABLE,
  COMMENT_LIMIT,
  groupVariants,
  markerIndex,
  renderComments,
} from './pr-comment.ts';

const commentOptions = {
  runUrl: 'https://github.com/o/r/actions/runs/1',
  imageUrl: (file: string): string => `https://img/${file}`,
};

/**
 * 테스트용 변형 결과를 만든다.
 * @param component 컴포넌트
 * @param variant 변형
 * @param messages 실패 메시지
 * @returns 변형 결과
 */
function result(component: string, variant: string, messages: string[]): VariantResult {
  return {
    component,
    variant,
    failures: messages.map((message) => ({ layer: message.split(' ')[0] ?? '', message })),
    notes: [],
  };
}

/**
 * 테스트용 요약을 만든다.
 * @param results 변형 결과
 * @returns 요약
 */
function summary(results: VariantResult[]): ParitySummary {
  return {
    total: results.length,
    failed: results.filter((item) => item.failures.length > 0).length,
    results,
    fileErrors: [],
  };
}

/**
 * 테스트용 캡처 표 줄을 만든다.
 * @param component 컴포넌트
 * @param variant 결과 이름
 * @param change 바꿀 필드
 * @returns 캡처 표 줄
 */
function row(component: string, variant: string, change: Partial<CaptureRow> = {}): CaptureRow {
  return {
    component,
    variant,
    baseVariant: variant,
    isCase: false,
    figma: `${component}/${variant}/capture-figma.png`,
    code: `${component}/${variant}/capture-code.png`,
    error: null,
    ...change,
  };
}

// @codocs [[피그마 일치 검사:CI 비교]]
describe('PR 댓글', () => {
  it('모두 통과하고 캡처 표가 없으면 통과 한 줄과 실행 링크다', () => {
    const { bodies } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
    );
    expect(bodies).toEqual([
      '<!-- figma-parity -->\n피그마 일치 검사: 1개 모두 통과\n\n[실행 결과](https://github.com/o/r/actions/runs/1)',
    ]);
  });

  it('컴포넌트마다 접힌 블록에 실패를 고칠 것으로 쓰고, 같은 실패는 변형을 묶어 한 줄로 쓴다', () => {
    const { bodies } = renderComments(
      summary([
        result('button', 'style=accent,state=rest', ['root 반경 4 → 5']),
        result('button', 'style=accent,state=hover', [
          'root 반경 4 → 5',
          "label 글자 '안녕' → '안녕하세요'",
        ]),
        result('button', 'style=subtle,state=rest', []),
      ]),
      commentOptions,
    );
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('피그마 일치 검사: 3개 중 2개 실패');
    expect(bodies[0]).toContain('<details><summary>button (2개 실패)</summary>');
    expect(bodies[0]).toContain('- style=accent · state=rest, hover: root 반경 4 → 5');
    expect(bodies[0]).toContain("- style=accent · state=hover: label 글자 '안녕' → '안녕하세요'");
    expect(bodies[0]).not.toContain('style=subtle');
  });

  it('판정이 실패하면 캡처 표를 넣지 않는다', () => {
    const { bodies, images } = renderComments(
      summary([result('button', 'state=rest', ['root 반경 4 → 5'])]),
      commentOptions,
      { kind: 'table', captures: { rows: [row('button', 'state=rest')] } },
    );
    expect(bodies[0]).not.toContain('캡처 표');
    expect(images).toEqual([]);
  });

  it('파일 오류만 있어도 실패다', () => {
    const { bodies } = renderComments(
      { ...summary([result('button', 'state=rest', [])]), fileErrors: ['button/x.png이 없다'] },
      commentOptions,
    );
    expect(bodies[0]).toContain('피그마 일치 검사: 1개 중 0개 실패');
    expect(bodies[0]).toContain('- button/x.png이 없다');
  });
});

// @codocs [[피그마 일치 검사:캡처 표]]
describe('PR 댓글 캡처 표', () => {
  it('판정이 통과하면 판정 결과 아래에 컴포넌트마다 피그마 | 코드 표를 둔다', () => {
    const { bodies, images } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
      {
        kind: 'table',
        captures: {
          rows: [
            row('button', 'state=rest'),
            row('button', 'state=rest,showIcon=true', {
              baseVariant: 'state=rest',
              isCase: true,
              figma: null,
            }),
          ],
        },
      },
    );
    const body = bodies[0] ?? '';
    expect(body.indexOf('모두 통과')).toBeLessThan(body.indexOf('| 변형 | 피그마 | 코드 |'));
    expect(body).toContain('<details open><summary>button (2개)</summary>');
    expect(body).toContain(
      '| `state=rest` | <img src="https://img/button/state=rest/capture-figma.png" alt="피그마"> | <img src="https://img/button/state=rest/capture-code.png" alt="코드"> |',
    );
    expect(body).toContain('| `state=rest,showIcon=true` | 피그마 PNG 없음(BOOLEAN 경우) |');
    expect(images).toEqual([
      'button/state=rest/capture-figma.png',
      'button/state=rest/capture-code.png',
      'button/state=rest,showIcon=true/capture-code.png',
    ]);
  });

  it('캡처하지 못한 줄은 이유를 쓴다', () => {
    const { bodies } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
      {
        kind: 'table',
        captures: { rows: [row('button', 'state=rest', { code: null, error: '보이지 않는다' })] },
      },
    );
    expect(bodies[0]).toContain('캡처 실패: 보이지 않는다');
  });

  it('캡처 표를 만들지 않았으면 이유를 쓴다', () => {
    const { bodies } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
      { kind: 'skipped', reason: '토큰·자산 확인이 실패했다' },
    );
    expect(bodies[0]).toContain('캡처 표를 만들지 않았다: 토큰·자산 확인이 실패했다');
  });

  it('줄이 많으면 표를 나누고 나뉜 표마다 머리를 다시 쓴다', () => {
    const rows = Array.from({ length: CAPTURE_ROWS_PER_TABLE + 1 }, (_, index) =>
      row('search-box', `state=s${String(index)}`),
    );
    const { bodies } = renderComments(
      summary([result('search-box', 'state=s0', [])]),
      commentOptions,
      { kind: 'table', captures: { rows } },
    );
    const all = bodies.join('\n');
    expect(all.split('| 변형 | 피그마 | 코드 |')).toHaveLength(3);
    expect(all).toContain(`<details open><summary>search-box (계속) (${String(rows.length)}개)`);
  });
});

// @codocs [[피그마 일치 검사:CI 비교]]
describe('PR 댓글 길이', () => {
  it('길이 제한을 넘으면 실패를 빼지 않고 댓글을 나눈다', () => {
    const many = Array.from({ length: 3000 }, (_, index) =>
      result('button', `state=s${String(index)}`, [
        `label 글자 '${'가'.repeat(20)}${String(index)}' → '다름'`,
      ]),
    );
    const { bodies } = renderComments(summary(many), commentOptions);
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(bodies.map(markerIndex)).toEqual(bodies.map((_, index) => index + 1));
    const all = bodies.join('\n');
    expect(many.every((item) => all.includes(item.variant.split('=')[1] ?? ''))).toBe(true);
  });

  it('긴 캡처 표도 길이 제한 안에서 여러 댓글로 나눈다', () => {
    const rows = Array.from({ length: 600 }, (_, index) =>
      row('button', `style=accent,state=s${String(index)},showIcon=true`),
    );
    const { bodies, images } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
      { kind: 'table', captures: { rows } },
    );
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(images).toHaveLength(1200);
  });

  it('변형 이름은 마지막 속성만 다른 것끼리 묶는다', () => {
    expect(
      groupVariants([
        'kind=default,state=rest',
        'kind=default,state=hover',
        'kind=submenu,state=rest',
      ]),
    ).toBe('kind=default · state=rest, hover; kind=submenu · state=rest');
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { ParitySummary, VariantResult } from './parity-summary.ts';
import { COMMENT_LIMIT, groupVariants, markerIndex, renderComments } from './pr-comment.ts';

const commentOptions = {
  runUrl: 'https://github.com/o/r/actions/runs/1',
  imageUrl: (file: string): string => `https://img/${file}`,
};

/**
 * 테스트용 변형 결과를 만든다.
 * @param component 컴포넌트
 * @param variant 변형
 * @param messages 실패 메시지
 * @param images 이미지 묶음
 * @returns 변형 결과
 */
function result(
  component: string,
  variant: string,
  messages: string[],
  images: VariantResult['images'] = [],
): VariantResult {
  return {
    component,
    variant,
    failures: messages.map((message) => ({ layer: message.split(' ')[0] ?? '', message })),
    notes: [],
    images,
    vectorRatios: {},
    pixelRatio: null,
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

// @codocs [[피그마 일치 검사:CI 비교]]
describe('PR 댓글', () => {
  it('모두 통과하면 한 줄 통과 메시지다', () => {
    const { bodies } = renderComments(
      summary([result('button', 'state=rest', [])]),
      commentOptions,
    );
    expect(bodies).toEqual(['<!-- figma-parity -->\n피그마 일치 검사: 1개 모두 통과']);
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

  it('픽셀·벡터 실패만 피그마 | 브라우저 | 차이 이미지를 한 줄로 보여 준다', () => {
    const { bodies, images } = renderComments(
      summary([
        result(
          'menu-item',
          'state=rest',
          ['chevron 모양 다름'],
          [
            {
              label: 'chevron',
              files: [
                'vector-chevron-expected.png',
                'vector-chevron-actual.png',
                'vector-chevron-diff.png',
              ],
            },
          ],
        ),
        result('menu-item', 'state=hover', ['root 반경 4 → 5']),
      ]),
      commentOptions,
    );
    expect(bodies[0]).toContain(
      '| state=rest · chevron | <img src="https://img/menu-item/state=rest/vector-chevron-expected.png" height="64">',
    );
    expect(images).toHaveLength(3);
  });

  it('길이 제한을 넘으면 이미지를 먼저 빼고, 그래도 넘으면 실패를 빼지 않고 댓글을 나눈다', () => {
    const many = Array.from({ length: 3000 }, (_, index) =>
      result(
        'button',
        `state=s${index}`,
        [`label 글자 '${'가'.repeat(20)}${index}' → '다름'`],
        [{ label: '전체', files: ['expected.png', 'actual.png', 'diff.png'] }],
      ),
    );
    const { bodies, images } = renderComments(summary(many), commentOptions);
    expect(images).toEqual([]);
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(bodies.map(markerIndex)).toEqual(bodies.map((_, index) => index + 1));
    const all = bodies.join('\n');
    expect(many.every((item) => all.includes(item.variant.split('=')[1] ?? ''))).toBe(true);
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

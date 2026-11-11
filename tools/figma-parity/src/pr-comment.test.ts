import { describe, expect, it } from 'vitest';

import { COMMENT_LIMIT, marker, markerIndex, paginate } from './pr-comment.ts';

const options = { marker: 'motion-check', tableHeader: ['| 키 | 값 |', '|---|---|'] };

/**
 * 테스트용 표 블록을 만든다.
 * @param name 블록 이름
 * @param rowCount 표 줄 수
 * @returns 접힌 블록 하나
 */
function tableBlock(name: string, rowCount: number): string {
  const rows = Array.from(
    { length: rowCount },
    (_, index) => `| \`key-${String(index)}-${'x'.repeat(20)}\` | value |`,
  );
  return [
    `<details open><summary>${name} (${String(rowCount)}개)</summary>`,
    '',
    ...options.tableHeader,
    ...rows,
    '',
    '</details>',
  ].join('\n');
}

// @codocs [[피그마 연동:모션]]
describe('PR 댓글 길이', () => {
  it('짧으면 댓글 하나에 숨은 표시를 달아 담는다', () => {
    const bodies = paginate('머리', [tableBlock('A', 2)], '꼬리', options);
    expect(bodies).toHaveLength(1);
    expect(markerIndex(bodies[0] ?? '', 'motion-check')).toBe(1);
    expect(bodies[0]).toContain('꼬리');
  });

  it('길이 제한을 넘으면 번호를 붙인 댓글로 이어 쓴다', () => {
    const bodies = paginate('머리', [tableBlock('A', 3000)], '꼬리', options);
    expect(bodies.length).toBeGreaterThan(1);
    expect(bodies.every((body) => body.length <= COMMENT_LIMIT)).toBe(true);
    expect(bodies.map((body) => markerIndex(body, 'motion-check'))).toEqual(
      bodies.map((_, index) => index + 1),
    );
  });

  it('나뉜 조각마다 표 머리를 다시 쓴다', () => {
    const all = paginate('머리', [tableBlock('A', 3000)], '꼬리', options).join('\n');
    expect(all.split('| 키 | 값 |').length).toBeGreaterThan(2);
    expect(all).toContain('A (3000개) (계속)');
  });
});

describe('숨은 표시', () => {
  it('첫 댓글은 번호 없이, 이어지는 댓글은 번호를 붙인다', () => {
    expect(marker(1, 'motion-check')).toBe('<!-- motion-check -->');
    expect(marker(2, 'motion-check')).toBe('<!-- motion-check 2 -->');
  });

  it('다른 이름의 표시는 찾지 않는다', () => {
    expect(markerIndex('<!-- motion-check 2 -->\n본문', 'motion-check')).toBe(2);
    expect(markerIndex('<!-- other -->\n본문', 'motion-check')).toBeUndefined();
  });
});

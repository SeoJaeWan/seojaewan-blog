import { describe, expect, it } from 'vitest';

import { findRule, splitSentences, suggestMissing } from './suggest.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('빠진 값 제안', () => {
  it('문서 본문을 표 칸·목록·문장 단위로 나눈다', () => {
    expect(
      splitSentences(
        '| 항목 | 모바일 |\n|---|---|\n- 길게 누르기로 연다. 따라오는 클릭은 무시한다.',
      ),
    ).toEqual(['길게 누르기로 연다.', '따라오는 클릭은 무시한다.']);
  });

  it('값 전체가 든 문장을 먼저, 그다음 낱말이 든 짧은 문장을 고른다', () => {
    const bodies = new Map([
      ['[[a:b]]', '붙여넣기는 아무 곳에서나 한다.\n옮길 수 없는 곳이면 붙여넣기가 비활성이다.'],
      ['[[a:c]]', '휴지통에 들어간 항목은 빼고 붙인다.'],
    ]);
    expect(findRule('옮길 수 없는 곳', bodies)).toEqual({
      link: '[[a:b]]',
      sentence: '옮길 수 없는 곳이면 붙여넣기가 비활성이다.',
    });
    expect(findRule('잘라낸 항목을 휴지통에 보냄', bodies)?.link).toBe('[[a:c]]');
    expect(findRule('노트북', bodies)).toBeNull();
  });

  it('기준 케이스 시나리오로 제안 시나리오를 만들고 케이스·noCase 뼈대를 붙인다', () => {
    const suggestion = suggestMissing({
      key: 'input',
      label: '입력 방식',
      value: "키보드'",
      baseScenario: '폴더를 연다',
      bodies: new Map(),
    });
    expect(suggestion.scenario).toBe(
      "기준 케이스에서 입력 방식만 '키보드''(으)로 바꿔 한다 — 폴더를 연다",
    );
    expect(suggestion.caseSkeleton).toContain("change: { input: '키보드\\'' }");
    expect(suggestion.noCaseSkeleton).toContain("docs: ['[[문서:섹션]]']");
  });
});

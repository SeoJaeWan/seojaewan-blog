import { afterEach, describe, expect, it, vi } from 'vitest';

import { canonicalCategoryName } from './annotation-category';
import { annotationData } from './read-node';

// @codocs [[피그마 연동:모션]]
describe('주석 카테고리 이름', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('영어·한국어 기본 카테고리 이름을 영어 기준 이름으로 맞추고 대소문자·공백을 무시한다', () => {
    expect(canonicalCategoryName('개발')).toBe('Development');
    expect(canonicalCategoryName(' development ')).toBe('Development');
    expect(canonicalCategoryName('인터랙션')).toBe('Interaction');
    expect(canonicalCategoryName('상호작용')).toBe('Interaction');
    expect(canonicalCategoryName('접근성')).toBe('Accessibility');
    expect(canonicalCategoryName('ACCESSIBILITY')).toBe('Accessibility');
    expect(canonicalCategoryName('콘텐츠')).toBe('Content');
  });

  it('모르는 카테고리 이름은 그대로 둔다', () => {
    expect(canonicalCategoryName('디자인 메모')).toBe('디자인 메모');
  });

  it('한국어 카테고리의 "표시용" 주석을 표시용 레이어로 읽는다', async () => {
    vi.stubGlobal('figma', {
      annotations: {
        getAnnotationCategoryByIdAsync: () => Promise.resolve({ label: '개발' }),
      },
    });
    const annotations = await annotationData(
      {
        annotations: [{ label: '표시용: 호버 커서 그림', categoryId: 'c' }],
      } as unknown as BaseNode,
      new Map(),
    );
    expect(annotations).toEqual([{ text: '표시용: 호버 커서 그림', category: 'Development' }]);
  });
});

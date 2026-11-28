import { afterEach, describe, expect, it, vi } from 'vitest';

import { canonicalCategoryName } from './annotation-category';
import { behaviorOf, createReadContext } from './read-node';

// @codocs [[디자인 시스템:동작의 종류]]
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

  it('한국어 화면의 Interaction 주석에서 동작의 종류를 읽는다', async () => {
    vi.stubGlobal('figma', {
      annotations: {
        getAnnotationCategoryByIdAsync: (id: string) =>
          Promise.resolve({ label: id === 'i' ? '인터랙션' : '개발' }),
      },
    });
    const node = {
      id: '1:1',
      annotations: [
        { label: '설명 문장', categoryId: 'd' },
        { label: ' button ', categoryId: 'i' },
      ],
    } as unknown as ComponentSetNode;
    expect(await behaviorOf(node, createReadContext(new Map(), new Map()))).toBe('button');
  });

  it('Interaction 주석이 없으면 동작의 종류가 없다', async () => {
    vi.stubGlobal('figma', {
      annotations: { getAnnotationCategoryByIdAsync: () => Promise.resolve({ label: '개발' }) },
    });
    const node = {
      id: '1:2',
      annotations: [{ label: 'button', categoryId: 'd' }],
    } as unknown as ComponentSetNode;
    expect(await behaviorOf(node, createReadContext(new Map(), new Map()))).toBeNull();
  });
});

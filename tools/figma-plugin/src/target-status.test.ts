import { describe, expect, it } from 'vitest';

import { newComponentIds } from './target-status';

// @codocs [[디자인 시스템:플러그인 화면]]
describe('대상 목록의 새로 만듦', () => {
  const paths = [
    'packages/design-system/src/components/button/button.json',
    'packages/design-system/src/components/button/button.layout.json',
    'packages/design-system/src/components/menu/menu.gen.tsx',
  ];

  it('저장소에 스키마가 있는 컴포넌트는 새로 만듦이 아니다', () => {
    expect(newComponentIds(paths, [{ id: '1', name: 'Button' }])).toEqual([]);
  });

  it('폴더만 있고 스키마가 없으면 새로 만듦이다', () => {
    expect(newComponentIds(paths, [{ id: '2', name: 'Menu' }])).toEqual(['2']);
  });

  it('이름으로 폴더를 정할 수 없는 컴포넌트는 새로 만듦이다', () => {
    expect(newComponentIds(paths, [{ id: '3', name: '버튼' }])).toEqual(['3']);
  });
});

import { describe, expect, it } from 'vitest';

import { componentPageOf } from './component-pages';

// @codocs [[디자인 시스템:내보낼 대상]]
describe('내보내는 컴포넌트 페이지', () => {
  it('Controls, Shell, Blog 세 페이지를 이름으로 찾는다', () => {
    expect(componentPageOf('Controls')).toBe('Controls');
    expect(componentPageOf('Shell')).toBe('Shell');
    expect(componentPageOf('Blog')).toBe('Blog');
  });

  it('Patterns, Screens, Foundations 같은 다른 페이지는 읽지 않는다', () => {
    expect(componentPageOf('Patterns')).toBeNull();
    expect(componentPageOf('Screens')).toBeNull();
    expect(componentPageOf('Foundations')).toBeNull();
    expect(componentPageOf('02 · Components')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { isCodeOnlyComponent } from './code-only.ts';

// @codocs [[컴포넌트 목록:코드 전용 컴포넌트]]
describe('코드 전용 컴포넌트', () => {
  it('감싸기·배치용 컴포넌트 폴더는 캡처하지 않는다', () => {
    expect(isCodeOnlyComponent('scroll-area')).toBe(true);
    expect(isCodeOnlyComponent('caption-button-group')).toBe(true);
    expect(isCodeOnlyComponent('scrollbar')).toBe(false);
    expect(isCodeOnlyComponent('separator')).toBe(false);
  });
});

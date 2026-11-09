import { describe, expect, it } from 'vitest';

import { isReordered } from './use-reorder-motion';

// @codocs [[항목 조작:순서 바꾸기 끌기]]
describe('항목 조작:순서 바꾸기 끌기 - 순서 바뀜', () => {
  it('같은 항목들의 순서가 바뀌었을 때만 움직인다', () => {
    expect(isReordered(['a', 'b', 'c'], ['b', 'a', 'c'])).toBe(true);
    expect(isReordered(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(false);
  });

  it('항목이 더해지거나 빠지면 움직이지 않는다', () => {
    expect(isReordered(['a', 'b'], ['b', 'a', 'c'])).toBe(false);
    expect(isReordered(['a', 'b', 'c'], ['c', 'a'])).toBe(false);
    expect(isReordered(['a', 'b'], ['c', 'a'])).toBe(false);
    expect(isReordered([], [])).toBe(false);
  });
});

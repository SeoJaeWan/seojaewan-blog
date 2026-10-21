import { describe, expect, it } from 'vitest';

import { stableStringify } from './stable-json';

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('내보낸 JSON은 diff가 안정적이도록 키를 정렬한다', () => {
  it('객체 키를 알파벳 순으로 재귀 정렬하고 배열 순서는 유지한다', () => {
    const text = stableStringify({ b: 1, a: { d: [3, 1], c: true }, $value: null });
    expect(Object.keys(JSON.parse(text) as object)).toEqual(['$value', 'a', 'b']);
    expect(text).toContain('"d": [\n      3,\n      1\n    ]');
  });

  it('2칸 들여쓰기와 끝 줄바꿈을 쓴다', () => {
    expect(stableStringify({ a: 1 })).toBe('{\n  "a": 1\n}\n');
  });
});

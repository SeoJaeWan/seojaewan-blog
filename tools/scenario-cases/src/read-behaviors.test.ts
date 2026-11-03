import { describe, expect, it } from 'vitest';

import { findCaseLine, sourceOf } from './read-behaviors.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('행위 정의 읽기', () => {
  it('정의 파일에서 케이스가 시작하는 줄을 id로 찾는다', () => {
    const text = "cases: [\n  {\n    id: 'base',\n  },\n  {\n    id: 'touch',\n  },\n]";
    expect(findCaseLine(text, 'touch')).toBe(6);
    expect(findCaseLine(text, 'none')).toBeNull();
  });

  it('실행 함수 코드에서 공통 들여쓰기를 걷어 낸다', () => {
    const text = "async run({ page }) {\n        await page.goto('/');\n\n      }";
    expect(sourceOf(text)).toBe("async run({ page }) {\n  await page.goto('/');\n\n}");
  });
});

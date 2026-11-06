import { describe, expect, it } from 'vitest';

import { buildBehaviorTable } from './build-table.ts';
import { findCaseLine, readBehaviors } from './read-behaviors.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('행위 정의 읽기', () => {
  it('정의 파일에서 케이스가 시작하는 줄을 id로 찾는다', () => {
    const text = "cases: [\n  {\n    id: 'base',\n  },\n  {\n    id: 'touch',\n  },\n]";
    expect(findCaseLine(text, 'touch')).toBe(6);
    expect(findCaseLine(text, 'none')).toBeNull();
  });

  it('저장소의 행위 정의는 기준 + 조건 하나씩 규칙에 어긋나는 곳이 없다', async () => {
    const behaviors = await readBehaviors();
    const problems = behaviors.flatMap((behavior) =>
      buildBehaviorTable(behavior, {
        docs: new Map(),
        code: new Map(),
        mode: 'local',
        repoUrl: '',
        generatedAt: '',
      })
        .problems.filter((problem) => !problem.includes('문서에 없는 링크'))
        .map((problem) => `${behavior.id}: ${problem}`),
    );
    expect(problems).toEqual([]);
    // 저장소의 행위 정의 파일을 모두 읽어 변환하므로, 전체 테스트와 함께 돌면 5초 기본 제한을 넘는다.
  }, 30_000);
});

import { describe, expect, it } from 'vitest';

import {
  type BehaviorSource,
  buildTable,
  grepToken,
  isAffected,
  type TableInputs,
} from './build-table.ts';
import type { CodocsDoc } from './doc-sections.ts';

const docs = new Map<string, CodocsDoc>([
  [
    '항목 조작',
    {
      name: '항목 조작',
      path: '.codocs/features/common/item-actions.yaml',
      sections: new Map([
        ['열기', '| 조작 | 동작 |\n|---|---|\n키보드로 고른 항목은 Enter로 연다.'],
        ['모바일', '모바일은 키보드가 없다.'],
      ]),
    },
  ],
]);

const inputs: TableInputs = {
  docs,
  code: new Map([
    [
      '[[항목 조작:열기]]',
      [{ file: 'apps/web/src/a.ts', line: 3, name: 'openItem', description: '항목을 연다.' }],
    ],
  ]),
  mode: 'local',
  repoUrl: 'https://github.com/o/r',
  generatedAt: '2026-11-03T00:00:00.000Z',
};

const behavior: BehaviorSource = {
  id: 'desktop-open-item',
  file: 'apps/web/e2e/behaviors/desktop-open-item.behavior.ts',
  name: '바탕화면 항목을 연다',
  area: '바탕화면',
  conditions: {
    item: { label: '여는 항목', values: ['폴더', '휴지통', '글'], base: '폴더' },
    input: { label: '입력 방식', values: ['마우스', '키보드', '터치', '펜'], base: '마우스' },
  },
  noCase: {
    input: { 펜: { reason: '펜은 마우스와 같다', docs: ['[[항목 조작:모바일]]'] } },
  },
  cases: [
    {
      id: 'base',
      scenario: '폴더를 더블클릭한다',
      expected: ['폴더가 열린다'],
      docs: ['[[항목 조작:열기]]'],
    },
    {
      id: 'bin',
      change: { item: '휴지통' },
      scenario: '휴지통을 더블클릭한다',
      expected: ['휴지통이 열린다'],
      docs: ['[[항목 조작:열기]]'],
    },
    {
      id: 'touch',
      change: { item: '글', input: '터치' },
      scenario: '글을 탭한다',
      expected: ['글이 열린다'],
      docs: ['[[항목 조작:열기]]'],
      device: 'Pixel 7',
    },
  ],
};

/**
 * 행위 하나의 조건 지도 칸을 `값:상태` 꼴로 꺼낸다.
 * @param source 행위 정의
 * @returns 조건 키 → 칸 목록
 */
function mapOf(source: BehaviorSource): Record<string, string[]> {
  const [table] = buildTable([source], inputs).behaviors;
  return Object.fromEntries(
    (table?.conditions ?? []).map((condition) => [
      condition.key,
      condition.values.map((cell) => `${cell.value}:${cell.state}`),
    ]),
  );
}

// @codocs [[테스트 작성 규칙:E2E]]
describe('시나리오 케이스 데이터', () => {
  it('케이스마다 조건 값을 채우고 기준과 다른 조건만 바뀐 조건으로 표시한다', () => {
    const [table] = buildTable([behavior], inputs).behaviors;
    expect(table?.cases[0]?.cells.map((cell) => [cell.value, cell.changed])).toEqual([
      ['폴더', false],
      ['마우스', false],
    ]);
    expect(table?.cases[2]?.changedKeys).toEqual(['item', 'input']);
    expect(table?.cases[2]).toMatchObject({
      key: 'desktop-open-item/touch',
      scenario: '글을 탭한다',
      expected: ['글이 열린다'],
      device: 'Pixel 7',
    });
  });

  it('값 칸은 케이스 있음, 케이스 없음+이유 있음, 빠짐 세 가지다', () => {
    expect(mapOf(behavior)).toEqual({
      item: ['폴더:case', '휴지통:case', '글:case'],
      input: ['마우스:case', '키보드:missing', '터치:case', '펜:reason'],
    });
    const [table] = buildTable([behavior], inputs).behaviors;
    expect(table?.counts).toEqual({ values: 7, covered: 5, reason: 1, missing: 1 });
    const pen = table?.conditions[1]?.values[3];
    expect(pen?.noCase).toMatchObject({ reason: '펜은 마우스와 같다' });
    expect(pen?.noCase?.docs[0]?.found).toBe(true);
  });

  it('빠진 값에는 근거 섹션에서 찾은 문장과 정의 파일에 붙일 뼈대를 붙인다', () => {
    const [table] = buildTable([behavior], inputs).behaviors;
    const keyboard = table?.conditions[1]?.values[1];
    expect(keyboard?.suggestion?.rule).toEqual({
      link: '[[항목 조작:열기]]',
      sentence: '키보드로 고른 항목은 Enter로 연다.',
    });
    expect(keyboard?.suggestion?.caseSkeleton).toContain("change: { input: '키보드' }");
    expect(keyboard?.suggestion?.noCaseSkeleton).toContain("'키보드': { reason: 'TODO'");
  });

  it('케이스가 쓰는 값이나 조건에 없는 값에 이유를 적으면 고칠 점으로 표시한다', () => {
    const odd: BehaviorSource = {
      ...behavior,
      noCase: {
        item: { 폴더: { reason: '기준이다', docs: ['[[항목 조작:열기]]'] } },
        input: { 발: { reason: '없는 값', docs: ['[[항목 조작:열기]]'] } },
      },
    };
    expect(buildTable([odd], inputs).behaviors[0]?.problems).toEqual([
      "여는 항목 '폴더'은 케이스가 있는데 케이스가 없는 이유도 적었다",
      "케이스가 없는 이유를 적은 값이 조건에 없다: input '발'",
    ]);
  });

  it('영역마다 행위·케이스·빠진 값 수를 더하고, 여러 행위에서 함께 빠진 값을 모은다', () => {
    const other: BehaviorSource = {
      ...behavior,
      id: 'explorer-open',
      area: '탐색기',
      noCase: undefined,
      cases: [behavior.cases[0] ?? { id: '', scenario: '', expected: [], docs: [] }],
    };
    const data = buildTable([other, behavior], inputs);
    expect(data.areas).toEqual([
      { area: '바탕화면', behaviors: 1, cases: 3, missing: 1, passed: 0, failed: 0 },
      { area: '탐색기', behaviors: 1, cases: 1, missing: 5, passed: 0, failed: 0 },
    ]);
    expect(data.totals).toMatchObject({ behaviors: 2, cases: 4, values: 14, missing: 6 });
    expect(data.commonMissing).toEqual([
      { label: '입력 방식', value: '키보드', behaviors: ['desktop-open-item', 'explorer-open'] },
    ]);
  });

  it('문서 링크를 섹션 첫 문장 줄로 풀고, 섹션 본문과 연결된 코드를 따로 모은다', () => {
    const data = buildTable([behavior], inputs);
    expect(data.behaviors[0]?.cases[0]?.docs[0]).toEqual({
      link: '[[항목 조작:열기]]',
      doc: '항목 조작',
      section: '열기',
      found: true,
      firstLine: '키보드로 고른 항목은 Enter로 연다.',
    });
    expect(data.sections['[[항목 조작:열기]]']?.code.map((ref) => ref.name)).toEqual(['openItem']);
    expect(data.sections['[[항목 조작:모바일]]']?.path).toBe(
      '.codocs/features/common/item-actions.yaml',
    );
  });

  it('시나리오·기대 결과·문서 링크가 없는 케이스는 근거 없음으로 표시한다', () => {
    const empty: BehaviorSource = {
      ...behavior,
      cases: [{ id: 'base', scenario: '', expected: [], docs: [] }],
    };
    expect(buildTable([empty], inputs).behaviors[0]?.cases[0]?.problems).toEqual([
      '근거 없음: 시나리오가 없다',
      '근거 없음: 기대 결과가 없다',
      '근거 없음: 문서 링크가 없다',
    ]);
  });

  it('문서에 없는 링크, 기준값과 같은 change, 바꾼 것이 없는 케이스를 고칠 점으로 표시한다', () => {
    const base = { scenario: '한다', expected: ['된다'] };
    const odd: BehaviorSource = {
      ...behavior,
      noCase: undefined,
      cases: [
        { id: 'base', ...base, docs: ['[[없는 문서:섹션]]'] },
        { id: 'same', ...base, change: { item: '폴더' }, docs: ['[[항목 조작:열기]]'] },
        { id: 'none', ...base, change: {}, docs: ['[[항목 조작:열기]]'] },
      ],
    };
    const rows = buildTable([odd], inputs).behaviors[0]?.cases;
    expect(rows?.[0]?.problems).toEqual(['문서에 없는 링크: [[없는 문서:섹션]]']);
    expect(rows?.[1]?.problems).toEqual(['여는 항목을 기준값과 같은 값으로 바꿨다']);
    expect(rows?.[2]?.problems).toEqual(['기준에서 바꾼 조건이 없다']);
  });

  it('결과는 시험 제목의 고르는 표시로, 실행 기록은 케이스 열쇠로 붙인다', () => {
    const run = {
      commit: 'abc',
      url: null,
      time: '2026-11-03T00:00:00.000Z',
      durationMs: 1,
      passed: 1,
      failed: 1,
    };
    const data = buildTable([behavior], {
      ...inputs,
      mode: 'report',
      results: new Map([
        [
          grepToken('desktop-open-item', 2),
          {
            status: 'failed',
            durationMs: 1200,
            trace: 'traces/a.zip',
            error: '못 찾음',
            checks: [{ name: '휴지통이 열린다', status: 'failed' }],
            film: [],
          },
        ],
      ]),
      history: [
        { ...run, time: 'b', results: { 'desktop-open-item/bin': 'failed' } },
        { ...run, time: 'a', results: { 'desktop-open-item/bin': 'passed' } },
      ],
    });
    expect(data.behaviors[0]?.cases[1]?.result?.status).toBe('failed');
    expect(data.behaviors[0]?.cases[1]?.history).toEqual(['passed', 'failed']);
    expect(data.behaviors[0]?.cases[0]?.result).toBeNull();
    expect(data.totals).toMatchObject({ passed: 0, failed: 1 });
    expect(data.runs.map((item) => item.time)).toEqual(['b', 'a']);
  });
});

// @codocs [[테스트 작성 규칙:E2E]]
describe('이번 PR이 영향을 주는 케이스', () => {
  const links = ['[[항목 조작:열기]]'];
  /**
   * 바뀐 파일을 넣은 입력을 만든다.
   * @param files 바뀐 파일
   * @returns 표 입력
   */
  function withChanges(files: string[]): TableInputs {
    return { ...inputs, changes: { base: 'main', files } };
  }

  it('정의 파일이나 정의 도우미가 바뀌면 영향받는다', () => {
    expect(isAffected(behavior, links, withChanges([behavior.file]))).toBe(true);
    expect(isAffected(behavior, links, withChanges(['apps/web/e2e/behaviors/app-steps.ts']))).toBe(
      true,
    );
    expect(
      isAffected(behavior, links, withChanges(['apps/web/e2e/behaviors/other.behavior.ts'])),
    ).toBe(false);
  });

  it('근거 섹션의 문서나 그 섹션에 연결된 제품 코드가 바뀌면 영향받는다', () => {
    expect(
      isAffected(behavior, links, withChanges(['.codocs/features/common/item-actions.yaml'])),
    ).toBe(true);
    expect(isAffected(behavior, links, withChanges(['apps/web/src/a.ts']))).toBe(true);
    expect(isAffected(behavior, links, withChanges(['apps/web/src/b.ts']))).toBe(false);
  });

  it('바뀐 파일을 모르면 영향받지 않는다', () => {
    expect(isAffected(behavior, links, inputs)).toBe(false);
  });
});

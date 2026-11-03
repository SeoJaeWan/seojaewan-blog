import { describe, expect, it } from 'vitest';

import { type BehaviorSource, buildTable, grepToken, type TableInputs } from './build-table.ts';
import type { CodocsDoc } from './doc-sections.ts';

const docs = new Map<string, CodocsDoc>([
  [
    '항목 조작',
    {
      name: '항목 조작',
      path: '.codocs/features/common/item-actions.yaml',
      sections: new Map([['열기', '| 조작 | 동작 |\n|---|---|']]),
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
  generatedAt: '2026-11-03T00:00:00.000Z',
};

const behavior: BehaviorSource = {
  id: 'desktop-open-item',
  file: 'apps/web/e2e/behaviors/desktop-open-item.behavior.ts',
  name: '바탕화면 항목을 연다',
  area: '바탕화면',
  conditions: {
    item: { label: '항목', values: ['폴더', '휴지통', '글'], base: '폴더' },
    input: { label: '입력', values: ['마우스', '키보드', '터치'], base: '마우스' },
  },
  cases: [
    { id: 'base', purpose: '폴더를 연다', docs: ['[[항목 조작:열기]]'] },
    {
      id: 'bin',
      change: { item: '휴지통' },
      purpose: '휴지통을 연다',
      docs: ['[[항목 조작:열기]]'],
    },
    {
      id: 'touch',
      change: { item: '글', input: '터치' },
      purpose: '글을 탭으로 연다',
      docs: ['[[항목 조작:열기]]'],
      device: 'Pixel 7',
    },
  ],
};

// @codocs [[테스트 작성 규칙:E2E]]
describe('행위 표', () => {
  it('케이스마다 조건 열의 값을 채우고 기준과 다른 칸만 바뀐 칸으로 표시한다', () => {
    const [table] = buildTable([behavior], inputs).behaviors;
    expect(table?.cases[0]?.cells.map((cell) => [cell.value, cell.changed])).toEqual([
      ['폴더', false],
      ['마우스', false],
    ]);
    expect(table?.cases[2]?.cells.map((cell) => [cell.value, cell.changed])).toEqual([
      ['글', true],
      ['터치', true],
    ]);
    expect(table?.cases[2]?.changedCount).toBe(2);
  });

  it('빠진 값은 기준값도 아니고 어떤 케이스도 바꾸지 않은 값이다', () => {
    const [table] = buildTable([behavior], inputs).behaviors;
    expect(table?.missing).toEqual([{ key: 'input', label: '입력', value: '키보드' }]);
  });

  it('영역마다 행위·케이스·빠진 값 수를 더한다', () => {
    const other: BehaviorSource = {
      ...behavior,
      id: 'explorer-open',
      area: '탐색기',
      cases: [{ id: 'base', purpose: '폴더를 연다', docs: ['[[항목 조작:열기]]'] }],
    };
    const data = buildTable([other, behavior], inputs);
    expect(data.areas).toEqual([
      { area: '바탕화면', behaviors: 1, cases: 3, missing: 1 },
      { area: '탐색기', behaviors: 1, cases: 1, missing: 4 },
    ]);
    expect(data.totals).toMatchObject({ behaviors: 2, cases: 4, missing: 5 });
  });

  it('문서 링크를 섹션 첫 줄과 그 섹션에 연결된 제품 코드로 풀어 쓴다', () => {
    const doc = buildTable([behavior], inputs).behaviors[0]?.cases[0]?.docs[0];
    expect(doc).toMatchObject({
      doc: '항목 조작',
      section: '열기',
      found: true,
      firstLine: '| 조작 | 동작 |',
      path: '.codocs/features/common/item-actions.yaml',
    });
    expect(doc?.code.map((ref) => ref.name)).toEqual(['openItem']);
  });

  it('목적이나 문서 링크가 없는 케이스는 근거 없음으로 표시한다', () => {
    const empty: BehaviorSource = {
      ...behavior,
      cases: [{ id: 'base', purpose: '', docs: [] }],
    };
    expect(buildTable([empty], inputs).behaviors[0]?.cases[0]?.problems).toEqual([
      '근거 없음: 목적이 없다',
      '근거 없음: 문서 링크가 없다',
    ]);
  });

  it('문서에 없는 링크, 기준값과 같은 change, 바꾼 것이 없는 케이스를 고칠 점으로 표시한다', () => {
    const odd: BehaviorSource = {
      ...behavior,
      cases: [
        { id: 'base', purpose: '기준', docs: ['[[없는 문서:섹션]]'] },
        { id: 'same', change: { item: '폴더' }, purpose: '같은 값', docs: ['[[항목 조작:열기]]'] },
        { id: 'none', change: {}, purpose: '바꾼 것 없음', docs: ['[[항목 조작:열기]]'] },
      ],
    };
    const rows = buildTable([odd], inputs).behaviors[0]?.cases;
    expect(rows?.[0]?.problems).toEqual(['문서에 없는 링크: [[없는 문서:섹션]]']);
    expect(rows?.[1]?.problems).toEqual(['항목을 기준값과 같은 값으로 바꿨다']);
    expect(rows?.[2]?.problems).toEqual(['기준에서 바꾼 조건이 없다']);
  });

  it('결과가 있으면 시험 제목의 고르는 표시로 케이스에 붙인다', () => {
    const data = buildTable([behavior], {
      ...inputs,
      mode: 'report',
      results: new Map([
        [
          grepToken('desktop-open-item', 2),
          { status: 'failed', durationMs: 1200, trace: 'traces/a.zip', error: '못 찾음' },
        ],
      ]),
    });
    expect(data.behaviors[0]?.cases[1]?.result?.status).toBe('failed');
    expect(data.behaviors[0]?.cases[0]?.result).toBeNull();
    expect(data.totals).toMatchObject({ passed: 0, failed: 1 });
  });
});

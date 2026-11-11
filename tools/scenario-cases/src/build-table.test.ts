import { describe, expect, it } from 'vitest';

import {
  type BehaviorSource,
  buildTable,
  grepToken,
  resolveValues,
  type TableInputs,
} from './build-table.ts';
import type { CodocsDoc } from './doc-sections.ts';
import type { BehaviorTable } from './table-types.ts';

const docs = new Map<string, CodocsDoc>([
  [
    '항목 조작',
    {
      name: '항목 조작',
      path: '.codocs/features/common/item-actions.yaml',
      sections: new Map([
        ['열기', '키보드로 고른 항목은 Enter로 연다.'],
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

const step = { expected: ['된다'], docs: ['[[항목 조작:열기]]'] };

const behavior: BehaviorSource = {
  id: 'desktop-open-item',
  file: 'apps/web/e2e/behaviors/desktop-open-item.behavior.ts',
  name: '바탕화면 항목을 연다',
  area: '바탕화면',
  summary: '폴더·휴지통이 열림·탭으로 열림',
  conditions: {
    item: { label: '연 항목', values: ['폴더', '휴지통', '글'], base: '폴더' },
    input: { label: '입력 방식', values: ['마우스', '키보드', '터치', '펜'], base: '마우스' },
    chrome: { label: '열린 Chrome 창', values: ['없음', '있음'], base: '없음' },
    screen: { label: '화면 크기', values: ['PC', '노트북', '모바일'], base: 'PC' },
  },
  requires: [{ when: { input: '터치' }, then: { screen: '모바일' } }],
  noCase: {
    input: { 펜: { reason: '펜은 마우스와 같다', docs: ['[[항목 조작:모바일]]'] } },
  },
  cases: [
    { id: 'base', scenario: '폴더를 더블클릭한다', result: '폴더가 열림', ...step },
    {
      id: 'bin',
      change: { item: '휴지통' },
      scenario: '휴지통을 더블클릭한다',
      result: '휴지통이 열림',
      ...step,
    },
    {
      id: 'post-again',
      change: { item: '글' },
      combine: { change: { chrome: '있음' }, reason: 'Chrome이 있어야 탭이 늘어난다' },
      scenario: '글을 다시 연다',
      result: '탭이 늘어남',
      ...step,
    },
    {
      id: 'touch',
      change: { input: '터치' },
      scenario: '폴더를 탭한다',
      result: '탭에 열림',
      device: 'Pixel 7',
      ...step,
    },
  ],
};

/**
 * 표의 묶음과 줄을 `묶음: 줄종류(번호) 바뀐값` 꼴로 꺼낸다.
 * @param table 행위 표
 * @returns 묶음마다 줄 요약
 */
function outline(table: BehaviorTable | undefined): string[] {
  return (table?.groups ?? []).map(
    (group) =>
      `${group.label}: ${group.rows
        .map(
          (row) =>
            `${row.kind}${row.case === null ? '' : `(${String(row.case)})`} ${row.cells
              .filter((cell) => cell.isChanged)
              .map((cell) => cell.value)
              .join('+')}`,
        )
        .join(' / ')}`,
  );
}

// @codocs [[테스트 작성 규칙:E2E]]
describe('시나리오 케이스 표', () => {
  it('기준 묶음과 조건마다 "○○ 다름" 묶음을 만들고 값마다 케이스·이유·같은 케이스·빠짐 줄을 둔다', () => {
    const [table] = buildTable([behavior], inputs).behaviors;
    expect(outline(table)).toEqual([
      '기준: case(1) ',
      '연 항목 다름: case(2) 휴지통 / case(3) 글+있음',
      '입력 방식 다름: missing 키보드 / case(4) 터치+모바일 / reason 펜',
      '열린 Chrome 창 다름: missing 있음',
      '화면 크기 다름: missing 노트북 / same(4) 터치+모바일',
    ]);
    const same = table?.groups[4]?.rows[1];
    expect(same?.result).toBe('‘터치’ 줄과 같은 케이스');
    expect(table?.groups[2]?.rows[2]).toMatchObject({
      kind: 'reason',
      result: '펜은 마우스와 같다',
    });
    expect(table?.counts).toEqual({ values: 12, covered: 8, same: 1, reason: 1, missing: 3 });
    expect(table?.problems).toEqual([]);
  });

  it('의존은 연쇄로 따라가고, 케이스가 직접 바꾼 값은 의존이 덮지 않는다', () => {
    const chain = {
      conditions: behavior.conditions,
      requires: [
        { when: { item: '글' }, then: { input: '터치' } },
        { when: { input: '터치' }, then: { screen: '모바일' } },
      ],
    };
    expect(resolveValues(chain, { item: '글' })).toEqual({
      values: { item: '글', input: '터치', chrome: '없음', screen: '모바일' },
      required: new Set(['input', 'screen']),
    });
    expect(resolveValues(chain, { item: '글' }, { input: '펜' }).values.input).toBe('펜');
  });

  it('조건 둘 이상을 바꾼 케이스, 기준값과 같은 change, 없는 값, 겹치는 combine을 고칠 점으로 표시한다', () => {
    const odd: BehaviorSource = {
      ...behavior,
      noCase: { item: { 폴더: { reason: '기준이다', docs: ['[[항목 조작:열기]]'] } } },
      cases: [
        { id: 'base', scenario: '한다', result: '됨', ...step },
        {
          id: 'two',
          change: { item: '휴지통', chrome: '있음' },
          scenario: '한다',
          result: '됨',
          ...step,
        },
        { id: 'same', change: { item: '폴더' }, scenario: '한다', result: '됨', ...step },
        { id: 'bad', change: { input: '발' }, scenario: '한다', result: '', ...step },
        {
          id: 'overlap',
          change: { chrome: '있음' },
          combine: { change: { chrome: '있음' }, reason: '' },
          scenario: '한다',
          result: '됨',
          ...step,
        },
      ],
    };
    expect(buildTable([odd], inputs).behaviors[0]?.problems).toEqual([
      '2번 케이스: 기준에서 조건 하나만 바꾼다(지금 2개)',
      '3번 케이스: 연 항목을 기준값과 같은 값으로 바꿨다',
      "4번 케이스: 입력 방식에 없는 값 '발'",
      '4번 케이스: 결과(result)가 없다',
      '5번 케이스: combine이 바꾼 조건과 겹친다(열린 Chrome 창)',
      '5번 케이스: combine의 이유가 없다',
      "기준값에 케이스가 없는 이유를 적었다: 연 항목 '폴더'",
    ]);
  });

  it('문서 링크를 풀고 섹션마다 문서 경로와 연결된 코드를 모은다', () => {
    const data = buildTable([behavior], inputs);
    expect(data.behaviors[0]?.cases[0]?.docs[0]).toEqual({
      link: '[[항목 조작:열기]]',
      doc: '항목 조작',
      section: '열기',
      isFound: true,
    });
    expect(data.sections['[[항목 조작:열기]]']).toMatchObject({
      path: '.codocs/features/common/item-actions.yaml',
      code: [{ name: 'openItem' }],
    });
    expect(data.behaviors[0]?.cases[2]?.combineReason).toBe('Chrome이 있어야 탭이 늘어난다');
  });

  it('결과를 시험 제목의 고르는 표시로 붙이고 통과·실패를 센다', () => {
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
            checks: [{ name: '된다', status: 'failed' }],
          },
        ],
        [
          grepToken('desktop-open-item', 1),
          { status: 'flaky', durationMs: 1, trace: null, error: null, checks: [] },
        ],
      ]),
    });
    expect(data.behaviors[0]?.cases[1]?.outcome?.status).toBe('failed');
    expect(data.behaviors[0]?.cases[2]?.outcome).toBeNull();
    expect(data.totals).toMatchObject({
      behaviors: 1,
      cases: 4,
      passed: 1,
      failed: 1,
      values: 12,
      missing: 3,
    });
    expect(data.areas).toEqual(['바탕화면']);
  });

  it('보고서 설정(뷰어 주소, 실패만, PR 번호)을 화면 데이터에 싣는다. 로컬은 없다', () => {
    const report = { traceViewer: '../../trace/', isFailedOnly: true, pr: 7 };

    expect(buildTable([behavior], { ...inputs, mode: 'report', report }).report).toEqual(report);
    expect(buildTable([behavior], inputs).report).toBeNull();
  });
});

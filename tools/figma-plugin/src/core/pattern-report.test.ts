import { describe, expect, it } from 'vitest';

import type { NodeData } from './node-data';
import { node, segment, sides, solid } from './node-data.fixture';
import {
  colorText,
  nearestColor,
  nearestNumber,
  patternReport,
  reportSections,
  type TokenValue,
} from './pattern-report';

const tokens: TokenValue[] = [
  { name: 'spacing/sm', kind: 'number', value: 8 },
  { name: 'spacing/md', kind: 'number', value: 12 },
  { name: 'radius/control', kind: 'number', value: 4 },
  { name: 'opacity/cut', kind: 'number', value: 62 },
  { name: 'color/white/70', kind: 'color', value: { r: 1, g: 1, b: 1, a: 0.7 } },
  { name: 'color/black', kind: 'color', value: { r: 0, g: 0, b: 0, a: 1 } },
];

/**
 * 조립 루트를 만든다.
 * @param children 자식
 * @returns 루트
 */
function patternRoot(children: NodeData[]): NodeData {
  return node({
    path: '',
    type: 'COMPONENT',
    child: null,
    width: { value: 1280 },
    height: { value: 720 },
    children,
  });
}

/**
 * 인스턴스를 만든다.
 * @param path 레이어 경로
 * @param component 컴포넌트 이름
 * @param properties 컴포넌트 속성
 * @param children 안쪽 레이어
 * @returns 인스턴스
 */
function instance(
  path: string,
  component: string,
  properties: Record<string, string | boolean> = {},
  children: NodeData[] = [],
): NodeData {
  return node({
    path,
    type: 'INSTANCE',
    instance: { component, scaleFactor: 1, properties, overrides: [] },
    children,
  });
}

// @codocs [[피그마 연동:피그마 플러그인]]
// @codocs [[디자인 시스템:조립]]
describe('조립 보고', () => {
  it('쓴 컴포넌트를 컴포넌트·속성끼리 묶고, 인스턴스 안쪽은 보지 않는다', () => {
    const report = patternReport(
      patternRoot([
        instance('a', 'MenuItem', { State: 'Rest', Label: '열기' }, [
          instance('a/icon', 'icon/Open'),
        ]),
        instance('b', 'MenuItem', { Label: '열기', State: 'Rest' }),
        instance('c', 'MenuItem', { State: 'Hover', Label: '열기' }),
      ]),
      tokens,
      [],
    );
    expect(report.components).toEqual([
      { component: 'MenuItem', properties: { State: 'Rest', Label: '열기' }, paths: ['a', 'b'] },
      { component: 'MenuItem', properties: { State: 'Hover', Label: '열기' }, paths: ['c'] },
    ]);
    expect(report.drawn).toEqual([]);
  });

  it('슬롯 안에 조립이 놓은 것은 본다', () => {
    const slot = node({
      path: 'Flyout/Content',
      type: 'SLOT',
      children: [
        instance('Flyout/Content/item', 'MenuItem'),
        node({ path: 'Flyout/Content/line', type: 'RECTANGLE', fills: [solid('color/black')] }),
      ],
    });
    const report = patternReport(
      patternRoot([
        instance('Flyout', 'Flyout', {}, [
          node({ path: 'Flyout/bg', type: 'FRAME', fills: [solid()] }),
          slot,
        ]),
      ]),
      tokens,
      [],
    );
    expect(report.components.map((item) => item.component)).toEqual(['Flyout', 'MenuItem']);
    expect(report.drawn).toEqual([
      { path: 'Flyout/Content/line', nodeId: 'Flyout/Content/line', text: '칠·모양' },
    ]);
    expect(report.offToken).toEqual([]);
  });

  it('컴포넌트 밖에서 그린 바탕·선·효과·글자를 적는다', () => {
    const root = patternRoot([
      node({
        path: 'overlay',
        type: 'FRAME',
        fills: [solid('color/white/70')],
        strokes: [solid('color/black')],
        strokeWeight: sides({ value: 1, variable: 'stroke-width/default' }),
        effects: [{ type: 'DROP_SHADOW', isVisible: true, blendMode: 'NORMAL' }],
        effectStyle: 'Elevation/Card',
      }),
      node({
        path: 'title',
        type: 'TEXT',
        text: {
          autoResize: 'WIDTH_AND_HEIGHT',
          hasMissingFont: false,
          truncation: 'DISABLED',
          maxLines: null,
          segments: [segment()],
        },
      }),
    ]);
    root.fills = [solid('color/white/70')];
    const report = patternReport(root, tokens, []);
    expect(report.drawn.map((item) => [item.path, item.text])).toEqual([
      ['', '칠'],
      ['overlay', '칠·선·효과'],
      ['title', '글자'],
    ]);
  });

  it('Foundations에 없는 값을 가까운 토큰과 함께 적고 크기는 보지 않는다', () => {
    const row = node({
      path: 'row',
      type: 'FRAME',
      width: { value: 333 },
      opacity: { value: 0.6 },
      fills: [{ ...solid(), color: { r: 1, g: 1, b: 1, a: 0.68 } }],
      radius: {
        topLeft: { value: 5 },
        topRight: { value: 4, variable: 'radius/control' },
        bottomRight: { value: 0 },
        bottomLeft: { value: 0 },
      },
      layout: {
        mode: 'HORIZONTAL',
        wrap: 'NO_WRAP',
        primaryAlign: 'MIN',
        counterAlign: 'MIN',
        primarySizing: 'FIXED',
        counterSizing: 'FIXED',
        padding: {
          top: { value: 11 },
          right: { value: 8, variable: 'spacing/sm' },
          bottom: { value: 0 },
          left: { value: 0 },
        },
        itemSpacing: { value: 9 },
        counterAxisSpacing: null,
      },
    });
    const report = patternReport(patternRoot([row]), tokens, []);
    expect(report.offToken.map((item) => item.text)).toEqual([
      '칠 #ffffffad → 가까운 토큰 `color/white/70`(#ffffffb3)',
      '반경(topLeft) 5 → 가까운 토큰 `radius/control`(4)',
      '여백(top) 11 → 가까운 토큰 `spacing/md`(12)',
      '간격 9 → 가까운 토큰 `spacing/sm`(8)',
      '불투명도 60% → 가까운 토큰 `opacity/cut`(62)',
    ]);
  });

  it('글자 스타일과 글자 색이 연결되지 않은 구간을 적는다', () => {
    const text = node({
      path: 'label',
      type: 'TEXT',
      text: {
        autoResize: 'WIDTH_AND_HEIGHT',
        hasMissingFont: false,
        truncation: 'DISABLED',
        maxLines: null,
        segments: [
          segment({
            characters: '열기',
            textStyle: undefined,
            fills: [{ ...solid(), color: { r: 0, g: 0, b: 0, a: 1 } }],
            fillStyle: undefined,
          }),
        ],
      },
    });
    const report = patternReport(patternRoot([text]), tokens, []);
    expect(report.offToken.map((item) => item.text)).toEqual([
      '글자 "열기": 글자 스타일이 없다',
      '글자 "열기" 색 #000000 → 가까운 토큰 `color/black`(#000000)',
    ]);
  });

  it('Development 주석 "표시용" 레이어는 따로 분류하고 그 아래는 다른 항목에 넣지 않는다', () => {
    const cursor = node({
      path: 'cursor',
      type: 'FRAME',
      fills: [solid()],
      annotations: [{ text: '표시용: 호버 커서 그림', category: 'Development' }],
      children: [instance('cursor/icon', 'icon/Cursor')],
    });
    const note = node({
      path: 'note',
      type: 'FRAME',
      annotations: [{ text: '표시용', category: 'Accessibility' }],
    });
    const report = patternReport(patternRoot([cursor, note]), tokens, []);
    expect(report.displayOnly).toEqual([
      { path: 'cursor', nodeId: 'cursor', text: '표시용: 호버 커서 그림' },
    ]);
    expect(report.components).toEqual([]);
    expect(report.offToken).toEqual([]);
  });

  it('키프레임이 걸린 레이어를 움직임으로 적는다', () => {
    const report = patternReport(patternRoot([]), tokens, [
      { path: 'window', nodeId: '1:2', properties: ['OPACITY', 'SCALE_XY'] },
    ]);
    expect(report.motion).toEqual([{ path: 'window', nodeId: '1:2', text: 'OPACITY, SCALE_XY' }]);
  });

  it('보고를 화면·PR 본문 묶음으로 바꾸고 빈 묶음은 없음으로 쓴다', () => {
    const report = patternReport(
      patternRoot([instance('a', 'Button', { State: 'Rest' })]),
      tokens,
      [],
    );
    const sections = reportSections(report);
    expect(sections.map((section) => section.title)).toEqual([
      '사용한 컴포넌트',
      '컴포넌트 밖에서 그린 것',
      'Foundations에 없는 값',
      '표시용(Development 주석)',
      '움직임',
    ]);
    expect(sections[0]?.lines).toEqual([{ text: 'Button (State=Rest) ×1', nodeId: null }]);
    expect(sections[1]?.lines).toEqual([{ text: '없음', nodeId: null }]);
  });

  it('가까운 토큰은 같은 앞부분 변수 가운데 값이 가장 가까운 것이다', () => {
    expect(nearestNumber(10, 'spacing/', tokens)?.name).toBe('spacing/sm');
    expect(nearestNumber(10, 'blur/', tokens)).toBeNull();
    expect(nearestColor({ r: 0.1, g: 0.1, b: 0.1, a: 1 }, tokens)?.name).toBe('color/black');
    expect(colorText({ r: 1, g: 0.5, b: 0, a: 1 })).toBe('#ff8000');
  });
});

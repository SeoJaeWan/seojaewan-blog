import { describe, expect, it } from 'vitest';

import { noCodeVariables } from './code-variables';
import { layerTree, rootFrame } from './layer-tree';
import type { NodeData } from './node-data';
import { buttonRoot, node } from './node-data.fixture';

/**
 * 자식을 둔 변형 루트를 만든다.
 * @param children 자식
 * @returns 변형 루트
 */
function root(children: NodeData[]): NodeData {
  return node({ path: '', type: 'COMPONENT', child: null, children });
}

// @codocs [[피그마 연동:피그마 플러그인]]
describe('레이어 트리', () => {
  it('구조와 연결된 변수를 담고 기본값은 적지 않는다', () => {
    const tree = layerTree(buttonRoot(), noCodeVariables);
    expect(tree.type).toBeDefined();
    expect(tree).not.toHaveProperty('opacity');
    expect(tree).not.toHaveProperty('rotation');
    expect(JSON.stringify(tree)).toContain('spacing/');
  });

  it('회전과 비율, 최대 줄 수에 짝지은 코드 전용 변수를 적는다', () => {
    const codeVariables = {
      rotate: [{ name: 'rotate/quarter', value: 90 }],
      lineClamp: [{ name: 'line-clamp/two', value: 2 }],
      ratio: [{ name: 'ratio/wide', value: 1.6 }],
    };
    const tree = layerTree(
      root([
        node({ path: 'a', type: 'FRAME', rotation: -90, aspectRatio: 1.6 }),
        node({
          path: 'b',
          type: 'TEXT',
          text: {
            autoResize: 'HEIGHT',
            hasMissingFont: false,
            truncation: 'ENDING',
            maxLines: 2,
            segments: [],
          },
        }),
      ]),
      codeVariables,
    );
    const text = JSON.stringify(tree);
    expect(text).toContain('"variable":"rotate/quarter"');
    expect(text).toContain('"variable":"ratio/wide"');
    expect(text).toContain('"maxLinesVariable":"line-clamp/two"');
  });

  it('선이 레이아웃에 들어가는지, 자산 경로와 색을 담는다', () => {
    const tree = layerTree(
      root([
        node({
          path: 'a',
          type: 'FRAME',
          strokes: [
            { type: 'SOLID', isVisible: true, blendMode: 'NORMAL', variable: 'card-stroke/x' },
          ],
          isStrokeIncludedInLayout: true,
        }),
        node({
          path: 'b',
          type: 'INSTANCE',
          asset: {
            name: 'ic_fluent_link_20_regular',
            mainComponentId: 'm',
            group: 'Icons',
            kind: 'mono',
            sourceWidth: 20,
            sourceHeight: 20,
            problems: [],
            color: 'text-fill/secondary',
          },
        }),
      ]),
      noCodeVariables,
    );
    const text = JSON.stringify(tree);
    expect(text).toContain('"strokesIncludedInLayout":true');
    expect(text).toContain('"path":"icons/ic_fluent_link_20_regular"');
    expect(text).toContain('"color":"text-fill/secondary"');
  });
});

// @codocs [[피그마 연동:구조 검사]]
// @codocs [[디자인 기반:크기 변수]]
describe('레이어 트리: 주석과 견본 크기', () => {
  it('주석을 카테고리와 함께 적는다', () => {
    const tree = layerTree(
      node({
        path: '',
        type: 'COMPONENT',
        child: null,
        annotations: [
          { text: '넘치면 세로로 스크롤한다', category: 'Development' },
          { text: '설명', category: null },
        ],
      }),
      noCodeVariables,
    );
    expect(tree.annotations).toEqual([
      { text: '넘치면 세로로 스크롤한다', category: 'Development' },
      { text: '설명', category: null },
    ]);
  });

  it('변수 없는 고정 크기 축만 견본 크기로 적는다', () => {
    const tree = layerTree(
      node({
        path: '',
        type: 'COMPONENT',
        child: null,
        layout: null,
        width: { value: 320 },
        height: { value: 40, variable: 'size/control/height' },
      }),
      noCodeVariables,
    );
    expect(tree.sampleSize).toEqual(['width']);
    expect(tree.size).toEqual({ w: 320, h: 40 });
    expect(tree.height).toBe('size/control/height');
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('조립의 맨 바깥 프레임', () => {
  it('이름·크기 방식·크기만 적고 안쪽 트리는 적지 않는다', () => {
    const frame = rootFrame(
      node({
        path: '',
        type: 'COMPONENT',
        child: null,
        layout: null,
        width: { value: 1280 },
        height: { value: 800 },
        fills: [{ type: 'SOLID', isVisible: true, blendMode: 'NORMAL', variable: 'color/white' }],
        children: [node({ path: 'window', type: 'FRAME' })],
      }),
    );
    expect(frame).toEqual({
      name: '',
      size: { w: 1280, h: 800 },
      sizing: { h: 'FIXED', v: 'FIXED' },
    });
  });
});

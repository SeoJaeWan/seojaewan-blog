import { describe, expect, it } from 'vitest';

import { noCodeVariables } from './code-variables';
import { hasEmptyHugSlot, layerTree } from './layer-tree';
import type { NodeData } from './node-data';
import { buttonRoot, node } from './node-data.fixture';

/**
 * 슬롯을 만든다.
 * @param sizing 세로 크기 방식
 * @param children 안에 든 노드
 * @returns 슬롯
 */
function slot(sizing: string, children: NodeData[] = []): NodeData {
  return node({
    path: 'Content',
    type: 'SLOT',
    children,
    child: {
      sizingHorizontal: 'FILL',
      sizingVertical: sizing,
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    },
  });
}

/**
 * 자식을 둔 변형 루트를 만든다.
 * @param children 자식
 * @returns 변형 루트
 */
function root(children: NodeData[]): NodeData {
  return node({ path: '', type: 'COMPONENT', child: null, children });
}

// @codocs [[피그마 연동:구조 검사]]
describe('빈 HUG 슬롯', () => {
  it('비어 있고 내용에 맞추는 축이 있는 슬롯을 찾는다', () => {
    expect(hasEmptyHugSlot(root([slot('HUG')]))).toBe(true);
    expect(
      hasEmptyHugSlot(root([node({ path: 'a', type: 'FRAME', children: [slot('HUG')] })])),
    ).toBe(true);
  });

  it('내용이 든 슬롯과 고정·채움 슬롯은 아니다', () => {
    expect(hasEmptyHugSlot(root([slot('HUG', [node({ path: 'a', type: 'FRAME' })])]))).toBe(false);
    expect(
      hasEmptyHugSlot(
        root([
          node({
            path: 'b',
            type: 'SLOT',
            child: {
              sizingHorizontal: 'FILL',
              sizingVertical: 'FILL',
              positioning: 'AUTO',
              constraints: { horizontal: 'MIN', vertical: 'MIN' },
            },
          }),
        ]),
      ),
    ).toBe(false);
  });
});

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
            { type: 'SOLID', visible: true, blendMode: 'NORMAL', variable: 'card-stroke/x' },
          ],
          strokesIncludedInLayout: true,
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

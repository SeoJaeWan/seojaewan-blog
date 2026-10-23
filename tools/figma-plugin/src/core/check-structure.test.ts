import { describe, expect, it } from 'vitest';

import { buildLayers, hiddenLayerPaths } from './build-layers';
import { checkVariant } from './check-structure';
import type { NodeData } from './node-data';
import { buttonRoot, node, segment } from './node-data.fixture';

/**
 * 루트를 바꿔 검사하고 위반 이유만 돌려준다.
 * @param change 루트를 바꾸는 함수
 * @returns 위반 이유 목록
 */
function reasonsAfter(change: (root: NodeData) => void): string[] {
  const root = buttonRoot();
  change(root);
  return checkVariant(root, 'Button / Rest').map((violation) => violation.reason);
}

/**
 * 값이 있는지 확인하고 돌려준다.
 * @param value 값
 * @returns 값
 */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('값이 없다');
  }
  return value;
}

/**
 * 루트의 첫 자식(label)을 돌려준다.
 * @param root 루트
 * @returns 첫 자식
 */
function label(root: NodeData): NodeData {
  const [first] = root.children;
  if (first === undefined) {
    throw new Error('label이 없다');
  }
  return first;
}

/**
 * Flyout Content를 본뜬 슬롯을 만든다.
 * @returns 슬롯 노드
 */
function slot(): NodeData {
  const root = buttonRoot();
  return node({
    path: 'Content',
    type: 'SLOT',
    layout: { ...must(root.layout), primaryAlign: 'MIN', counterAlign: 'MIN' },
    child: { ...must(label(root).child), sizingHorizontal: 'FILL' },
  });
}

// @codocs [[피그마 일치 검사:구조 검사]]
describe('구조 검사', () => {
  it('변수·스타일에 연결된 정상 구조는 위반이 없다', () => {
    expect(reasonsAfter(() => undefined)).toEqual([]);
  });

  it('위반에는 레이어 경로·이유·고칠 방법이 있다', () => {
    const root = buttonRoot();
    root.fills = [{ type: 'SOLID', visible: true, blendMode: 'NORMAL', opacity: 1 }];
    expect(checkVariant(root, 'Button / Rest')).toEqual([
      {
        where: 'Button / Rest',
        reason: '단색 칠이 색 변수에 연결되어 있지 않다',
        fix: '칠 색을 색 변수에 연결한다.',
      },
    ]);
  });

  it('연결 안 된 여백·간격·반경·선 두께·불투명도를 막는다', () => {
    const reasons = reasonsAfter((root) => {
      if (root.layout !== null) {
        root.layout.padding.left = { value: 12 };
        root.layout.itemSpacing = { value: 8 };
      }
      root.children.push(node({ path: 'extra', type: 'RECTANGLE' }));
      root.radius = { ...must(root.radius), topLeft: { value: 4 } };
      root.strokeWeight = { ...must(root.strokeWeight), top: { value: 1 } };
      root.opacity = { value: 0.5 };
    });
    expect(reasons).toEqual(
      expect.arrayContaining([
        '여백(left) 12가 변수에 연결되어 있지 않다',
        '간격 8가 변수에 연결되어 있지 않다',
        '반경(topLeft) 4가 변수에 연결되어 있지 않다',
        '선 두께(top) 1가 변수에 연결되어 있지 않다',
        '불투명도 0.5가 변수에 연결되어 있지 않다',
      ]),
    );
  });

  it('블렌드 층이 있는 칠 스타일을 쓰면 막는다(일반 섞기만 지원)', () => {
    expect(
      reasonsAfter((root) => {
        root.fillStyle = 'Material/Mica Base';
        root.fills = [
          { type: 'SOLID', visible: true, blendMode: 'LUMINOSITY', opacity: 1 },
          { type: 'SOLID', visible: true, blendMode: 'COLOR', opacity: 0.5 },
        ];
      }),
    ).toEqual(['칠 스타일 Material/Mica Base에 블렌드 LUMINOSITY 층이 있다(일반 섞기만 지원)']);
  });

  it('그라데이션 선이 스타일에 연결되어 있지 않으면 막는다', () => {
    expect(reasonsAfter((root) => (root.strokeStyle = undefined))).toEqual([
      'GRADIENT_LINEAR 선이 스타일에 연결되어 있지 않다',
    ]);
  });

  it('효과는 효과 스타일이어야 하고, 투명한 부분 뒤 그림자는 막는다(D5)', () => {
    expect(
      reasonsAfter((root) => {
        root.effects = [
          { type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL', showShadowBehindNode: true },
        ];
      }),
    ).toEqual([
      '효과가 효과 스타일에 연결되어 있지 않다',
      '그림자 "투명한 부분 뒤에도 표시"는 막는다(D5)',
    ]);
  });

  it('수동 배치(자동 배치가 아닌 프레임에 자식)를 막는다(D1)', () => {
    expect(
      reasonsAfter((root) => {
        root.children.push(
          node({
            path: 'box',
            type: 'FRAME',
            layout: { ...must(root.layout), mode: 'NONE' },
            children: [node({ path: 'box/dot', type: 'RECTANGLE', parentLayoutMode: null })],
          }),
        );
      }),
    ).toContain('자동 배치가 아닌 프레임이 자식을 담고 있다(수동 배치, D1)');
  });

  it('절대 위치는 SCALE 제약만 막고 거리 값은 막지 않는다(D1)', () => {
    /**
     * 절대 위치 자식을 더해 검사한다.
     * @param horizontal 가로 제약
     * @returns 위반 이유
     */
    function absolute(horizontal: string): string[] {
      return reasonsAfter((root) => {
        root.children.push(
          node({
            path: 'badge',
            type: 'RECTANGLE',
            width: { value: 4, variable: 'size/badge' },
            height: { value: 4, variable: 'size/badge' },
            child: {
              ...must(label(root).child),
              sizingHorizontal: 'FIXED',
              sizingVertical: 'FIXED',
              positioning: 'ABSOLUTE',
              constraints: { horizontal, vertical: 'MIN' },
            },
          }),
        );
      });
    }
    for (const horizontal of ['MIN', 'MAX', 'STRETCH', 'CENTER']) {
      expect(absolute(horizontal)).toEqual([]);
    }
    expect(absolute('SCALE')).toEqual(['제약 SCALE는 막는다(D1)']);
  });

  it('GRID 자동 배치를 막는다(D7)', () => {
    expect(reasonsAfter((root) => (must(root.layout).mode = 'GRID'))).toEqual([
      'GRID 자동 배치는 막는다(D7)',
    ]);
  });

  it('고정 크기는 루트와 안쪽 모두 크기 변수에 연결해야 한다(D8)', () => {
    expect(
      reasonsAfter((root) => {
        must(root.layout).primarySizing = 'FIXED';
        must(label(root).text).autoResize = 'NONE';
      }),
    ).toEqual([
      '고정 너비 120가 크기 변수에 연결되어 있지 않다(D8)',
      '고정 너비 16가 크기 변수에 연결되어 있지 않다(D8)',
      '고정 높이 16가 크기 변수에 연결되어 있지 않다(D8)',
    ]);
  });

  it('회전은 90° 배수만 허용한다(D9)', () => {
    expect(reasonsAfter((root) => (label(root).rotation = 90))).toEqual([]);
    expect(reasonsAfter((root) => (label(root).rotation = 45))).toEqual([
      '회전 45°는 90° 배수가 아니다(D9)',
    ]);
  });

  it('직접 그린 벡터와 호·별을 막고, 완전한 원은 허용한다(D6)', () => {
    expect(reasonsAfter((root) => root.children.push(node({ path: 'v', type: 'VECTOR' })))).toEqual(
      ['VECTOR를 컴포넌트 안에 직접 그렸다'],
    );
    /**
     * 타원 자식을 더해 검사한다.
     * @param isFull 완전한 원인지
     * @returns 위반 이유
     */
    function circle(isFull: boolean): string[] {
      return reasonsAfter((root) =>
        root.children.push(
          node({
            path: 'dot',
            type: 'ELLIPSE',
            isFullEllipse: isFull,
            width: { value: 6, variable: 'size/dot' },
            height: { value: 6, variable: 'size/dot' },
            child: {
              ...must(label(root).child),
              sizingHorizontal: 'FIXED',
              sizingVertical: 'FIXED',
            },
          }),
        ),
      );
    }
    expect(circle(true)).toEqual([]);
    expect(circle(false)).toEqual(['ELLIPSE(호·별·다각형·선)는 막는다(D6)']);
  });

  it('점선·마스크·스무딩처럼 이름으로 비교할 수 없는 값을 막는다', () => {
    expect(
      reasonsAfter((root) => {
        root.dashPattern = [4, 4];
        root.isMask = true;
        root.cornerSmoothing = 0.6;
      }),
    ).toEqual([
      '마스크 레이어는 지원하지 않는다',
      '점선 패턴은 지원하지 않는다',
      '모서리 스무딩은 지원하지 않는다',
    ]);
  });

  it('분류표에 없는 값을 만나면 막는다', () => {
    expect(reasonsAfter((root) => (must(root.layout).primaryAlign = 'SPACE_DIAGONAL'))).toEqual([
      'primaryAxisAlignItems=SPACE_DIAGONAL는 분류표에 없는 값이다',
    ]);
    expect(
      reasonsAfter((root) => root.children.push(node({ path: 'x', type: 'HOLOGRAM' }))),
    ).toEqual(['노드 종류 HOLOGRAM는 분류표에 없다']);
  });

  it('글자 구간은 글자 스타일이 있어야 하고, 스타일 덮어쓰기와 대체 글꼴을 막는다', () => {
    expect(
      reasonsAfter((root) => {
        const text = must(label(root).text);
        text.hasMissingFont = true;
        text.segments = [
          segment({ textStyle: undefined, styleFields: undefined }),
          segment({ overrides: ['TEXT_DECORATION'], textDecoration: 'UNDERLINE' }),
        ];
      }),
    ).toEqual([
      '글꼴이 없어 대체 글꼴로 그려진다',
      '"버튼" 구간에 글자 스타일이 없다',
      '"버튼" 구간이 글자 스타일을 덮어썼다(TEXT_DECORATION)',
    ]);
  });

  it('슬롯은 칠·선·효과를 막고 간격은 변수에 연결해야 한다(G1)', () => {
    expect(reasonsAfter((root) => root.children.push(slot()))).toEqual([]);
    const painted = reasonsAfter((root) => {
      const content = slot();
      content.fills = [
        { type: 'SOLID', visible: true, blendMode: 'NORMAL', opacity: 1, variable: 'x/y' },
      ];
      root.children.push(content);
    });
    expect(painted).toEqual(['슬롯에 칠·선·효과가 있다(G1)']);
    const unboundGap = reasonsAfter((root) => {
      const content = slot();
      content.layout = { ...must(content.layout), itemSpacing: { value: 8 } };
      root.children.push(content);
    });
    expect(unboundGap).toEqual(['간격 8가 변수에 연결되어 있지 않다']);
  });

  it('형제 레이어 이름이 겹치면 짝지을 수 없어 막는다', () => {
    expect(
      reasonsAfter((root) =>
        root.hiddenChildren.push({ path: 'label', visibleProperty: undefined }),
      ),
    ).toEqual(['자식 레이어 경로 "label"가 겹친다']);
  });

  it('한 가지 색 자산의 색이 변수 하나로 정해지지 않으면 막는다(D6)', () => {
    expect(
      reasonsAfter((root) =>
        root.children.push(
          node({
            path: 'add icon',
            type: 'INSTANCE',
            width: { value: 16, variable: 'size/icon/16' },
            height: { value: 16, variable: 'size/icon/16' },
            child: {
              ...must(label(root).child),
              sizingHorizontal: 'FIXED',
              sizingVertical: 'FIXED',
            },
            asset: {
              name: 'ic_fluent_add_20_regular',
              mainComponentId: '1:1',
              group: 'Icons',
              kind: 'mono',
              problems: ['한 가지 색 자산인데 색이 여럿이다'],
            },
          }),
        ),
      ),
    ).toEqual(['자산 Icons/ic_fluent_add_20_regular: 한 가지 색 자산인데 색이 여럿이다']);
  });
});

// @codocs [[피그마 일치 검사:export.json 계약]]
describe('레이어 목록', () => {
  it('레이어마다 역할별 변수·스타일 이름과 자동 배치 선택지를 남기고 좌표는 남기지 않는다', () => {
    const [root, text] = buildLayers(buttonRoot());
    expect(root).toEqual({
      path: '',
      type: 'COMPONENT',
      parentLayout: null,
      sizing: { horizontal: 'HUG', vertical: 'HUG', minWidth: 'size/button/min-width' },
      fill: { variable: 'accent-fill/default' },
      stroke: {
        paint: { style: 'Elevation/Accent Control Border' },
        align: 'INSIDE',
        includedInLayout: false,
        weight: {
          top: 'stroke-width/default',
          right: 'stroke-width/default',
          bottom: 'stroke-width/default',
          left: 'stroke-width/default',
        },
      },
      radius: {
        topLeft: 'radius/control',
        topRight: 'radius/control',
        bottomRight: 'radius/control',
        bottomLeft: 'radius/control',
      },
      layout: {
        mode: 'HORIZONTAL',
        wrap: 'NO_WRAP',
        primaryAlign: 'CENTER',
        counterAlign: 'CENTER',
        padding: { top: 'spacing/6', right: 'spacing/12', bottom: 'spacing/6', left: 'spacing/12' },
        gap: null,
        counterGap: null,
      },
    });
    expect(text).toMatchObject({
      path: 'label',
      text: {
        characters: '버튼',
        autoResize: 'WIDTH_AND_HEIGHT',
        segments: [
          {
            start: 0,
            end: 2,
            fontFamily: 'Pretendard',
            textStyle: 'Hangul/Body',
            style: { fontSize: { variable: 'font/size/body' }, letterSpacing: { value: '0%' } },
            fill: { variable: 'text-on-accent-fill/primary' },
          },
        ],
      },
    });
    expect(JSON.stringify(text)).not.toMatch(/"x"|"y"/u);
  });

  it('슬롯은 자기 배치만 남기고 안쪽 내용은 남기지 않는다(G1)', () => {
    const root = buttonRoot();
    const content = slot();
    content.children = [label(buttonRoot())];
    root.children.push(content);
    const layers = buildLayers(root);
    const slotLayer = must(layers.find((layer) => layer.path === 'Content'));
    expect(Object.keys(slotLayer).sort()).toEqual([
      'layout',
      'parentLayout',
      'path',
      'sizing',
      'type',
    ]);
    expect(must(slotLayer.layout)).toMatchObject({ gap: 'spacing/8' });
    expect(
      layers.some((layer) => typeof layer.path === 'string' && layer.path.startsWith('Content/')),
    ).toBe(false);
  });

  it('절대 위치는 축마다 제약만 남기고 거리는 남기지 않는다(D1)', () => {
    const root = buttonRoot();
    root.children.push(
      node({
        path: 'bottom border',
        type: 'RECTANGLE',
        child: {
          ...must(label(root).child),
          sizingHorizontal: 'FIXED',
          sizingVertical: 'FIXED',
          positioning: 'ABSOLUTE',
          constraints: { horizontal: 'STRETCH', vertical: 'MAX' },
        },
      }),
    );
    const border = must(buildLayers(root).find((layer) => layer.path === 'bottom border'));
    expect(border.self).toEqual({
      absolute: { horizontal: { constraint: 'STRETCH' }, vertical: { constraint: 'MAX' } },
    });
  });

  it('숨긴 레이어는 목록에 넣지 않고 경로만 남긴다(D4)', () => {
    const root = buttonRoot();
    expect(buildLayers(root).map((layer) => layer.path)).toEqual(['', 'label']);
    expect(hiddenLayerPaths(root)).toEqual(['icon']);
  });
});

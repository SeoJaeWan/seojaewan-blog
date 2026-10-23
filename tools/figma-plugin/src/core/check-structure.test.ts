import { describe, expect, it } from 'vitest';

import { checkVariant } from './check-structure';
import type { NodeData } from './node-data';
import { buttonRoot, node, segment, solid } from './node-data.fixture';

const context = { imageHashes: new Set(['wallpaper-hash']) };

/**
 * 루트를 바꿔 검사하고 위반 이유만 돌려준다.
 * @param change 루트를 바꾸는 함수
 * @returns 위반 이유 목록
 */
function reasonsAfter(change: (root: NodeData) => void): string[] {
  const root = buttonRoot();
  change(root);
  return checkVariant(root, 'Button / Rest', context).map((violation) => violation.reason);
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
  return must(root.children[0]);
}

/**
 * 크기 변수에 연결한 고정 크기 자식을 만든다.
 * @param overrides 바꿀 값
 * @returns 노드 데이터
 */
function fixedChild(overrides: Partial<NodeData> & Pick<NodeData, 'path' | 'type'>): NodeData {
  return node({
    width: { value: 16, variable: 'size/icon/16' },
    height: { value: 16, variable: 'size/icon/16' },
    child: {
      sizingHorizontal: 'FIXED',
      sizingVertical: 'FIXED',
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    },
    ...overrides,
  });
}

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 변수·스타일에 연결되지 않은 시각 값', () => {
  it('변수·스타일에 연결된 정상 구조는 위반이 없다', () => {
    expect(reasonsAfter(() => undefined)).toEqual([]);
  });

  it('위반에는 레이어 경로·이유·고칠 방법이 있다', () => {
    const root = buttonRoot();
    root.fills = [solid()];
    expect(checkVariant(root, 'Button / Rest', context)).toEqual([
      {
        where: 'Button / Rest',
        reason: '단색 칠이 색 변수에 연결되어 있지 않다',
        fix: '칠 색을 색 변수에 연결한다.',
      },
    ]);
  });

  it('한 변형의 위반을 모두 한 번에 돌려준다', () => {
    const reasons = reasonsAfter((root) => {
      must(root.layout).padding.left = { value: 12 };
      must(root.layout).itemSpacing = { value: 8 };
      root.children.push(fixedChild({ path: 'icon', type: 'RECTANGLE' }));
      root.radius = { ...must(root.radius), topLeft: { value: 4 } };
      root.strokeWeight = { ...must(root.strokeWeight), top: { value: 1 } };
      root.opacity = { value: 0.5 };
    });
    expect(reasons).toEqual([
      '불투명도 0.5가 변수에 연결되어 있지 않다',
      '선 두께(top) 1가 변수에 연결되어 있지 않다',
      '반경(topLeft) 4가 변수에 연결되어 있지 않다',
      '여백(left) 12가 변수에 연결되어 있지 않다',
      '간격 8가 변수에 연결되어 있지 않다',
    ]);
  });

  it('고정 크기는 루트와 안쪽 모두 크기 변수에 연결해야 한다', () => {
    expect(
      reasonsAfter((root) => {
        must(root.layout).primarySizing = 'FIXED';
        root.children.push(fixedChild({ path: 'icon', type: 'RECTANGLE', width: { value: 16 } }));
      }),
    ).toEqual([
      '고정 너비 120가 크기 변수에 연결되어 있지 않다',
      '고정 너비 16가 크기 변수에 연결되어 있지 않다',
    ]);
  });

  it('그라데이션과 이미지는 칠 스타일로만, 효과는 효과 스타일로만 쓴다', () => {
    expect(
      reasonsAfter((root) => {
        root.strokeStyle = undefined;
        root.effects = [{ type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL' }];
      }),
    ).toEqual([
      'GRADIENT_LINEAR 선이 스타일에 연결되어 있지 않다',
      '효과가 효과 스타일에 연결되어 있지 않다',
    ]);
  });

  it('글자 구간은 글자 스타일에 연결해야 하고 스타일을 덮어쓰면 막는다', () => {
    expect(
      reasonsAfter((root) => {
        must(label(root).text).segments = [
          segment({ textStyle: undefined }),
          segment({ overrides: ['TEXT_DECORATION'] }),
        ];
      }),
    ).toEqual([
      '"버튼" 구간에 글자 스타일이 없다',
      '"버튼" 구간이 글자 스타일을 덮어썼다(TEXT_DECORATION)',
    ]);
  });

  it('토큰 클래스로 쓸 수 없는 값(90° 배수가 아닌 회전, 비례 제약)을 막는다', () => {
    expect(reasonsAfter((root) => (label(root).rotation = 180))).toEqual([]);
    expect(reasonsAfter((root) => (label(root).rotation = 45))).toEqual([
      '회전 45°는 90° 배수가 아니라 토큰 클래스로 쓸 수 없다',
    ]);
    expect(
      reasonsAfter((root) => {
        root.children.push(
          fixedChild({
            path: 'badge',
            type: 'RECTANGLE',
            child: {
              sizingHorizontal: 'FIXED',
              sizingVertical: 'FIXED',
              positioning: 'ABSOLUTE',
              constraints: { horizontal: 'SCALE', vertical: 'MIN' },
            },
          }),
        );
      }),
    ).toEqual(['비례 제약(SCALE)은 토큰 클래스로 쓸 수 없다']);
  });

  it('한 가지 색 자산의 색이 색 변수 하나로 정해지지 않으면 막는다', () => {
    expect(
      reasonsAfter((root) =>
        root.children.push(
          fixedChild({
            path: 'add icon',
            type: 'INSTANCE',
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

  it('슬롯은 채운 내용까지 같은 규칙으로 검사한다', () => {
    const slot = node({
      path: 'Content',
      type: 'SLOT',
      layout: { ...must(buttonRoot().layout), itemSpacing: { value: 8 } },
      children: [
        node({ path: 'Content/a', type: 'FRAME' }),
        node({ path: 'Content/b', type: 'FRAME', fills: [solid()] }),
      ],
    });
    expect(reasonsAfter((root) => root.children.push(slot))).toEqual([
      '간격 8가 변수에 연결되어 있지 않다',
      '단색 칠이 색 변수에 연결되어 있지 않다',
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: CSS로 그릴 수 없는 기능', () => {
  it('노이즈·텍스처·점진 블러 효과, 블렌드 효과, 투명한 부분 뒤 그림자를 막는다', () => {
    expect(
      reasonsAfter((root) => {
        root.effectStyle = 'Elevation/Flyout';
        root.effects = [
          { type: 'NOISE', visible: true, blendMode: 'NORMAL' },
          { type: 'TEXTURE', visible: true, blendMode: 'NORMAL' },
          { type: 'BACKGROUND_BLUR', visible: true, blendMode: 'NORMAL', blurType: 'PROGRESSIVE' },
          { type: 'DROP_SHADOW', visible: true, blendMode: 'MULTIPLY', showShadowBehindNode: true },
        ];
      }),
    ).toEqual([
      '효과 NOISE는 CSS로 그릴 수 없다',
      '효과 TEXTURE는 CSS로 그릴 수 없다',
      '흐림 PROGRESSIVE는 CSS로 그릴 수 없다',
      '효과에 블렌드 MULTIPLY가 들어 있다(CSS로 그릴 수 없다)',
      '그림자 "투명한 부분 뒤에도 표시"는 CSS로 그릴 수 없다',
    ]);
  });

  it('블렌드가 들어간 칠은 칠 스타일 안에 있어도 막는다', () => {
    expect(
      reasonsAfter((root) => {
        root.fillStyle = 'Material/Mica Base';
        root.fills = [{ type: 'SOLID', visible: true, blendMode: 'LUMINOSITY' }];
      }),
    ).toEqual(['칠에 블렌드 LUMINOSITY가 들어 있다(CSS로 그릴 수 없다)']);
  });

  it('점선, 가변 두께 선, 모서리 스무딩, 마스크를 막는다', () => {
    expect(
      reasonsAfter((root) => {
        root.dashPattern = [4, 4];
        root.variableWidthStroke = true;
        root.cornerSmoothing = 0.6;
        root.isMask = true;
      }),
    ).toEqual([
      '마스크는 CSS로 그릴 수 없다',
      '점선은 CSS로 같게 그릴 수 없다',
      '가변 두께·브러시 선은 CSS로 그릴 수 없다',
      '모서리 스무딩은 CSS로 그릴 수 없다',
    ]);
  });

  it('자산이 아닌 벡터·호를 막고 완전한 원은 허용한다', () => {
    expect(
      reasonsAfter((root) => root.children.push(fixedChild({ path: 'v', type: 'VECTOR' }))),
    ).toEqual(['VECTOR는 CSS로 그릴 수 없는 모양이다']);
    expect(
      reasonsAfter((root) =>
        root.children.push(fixedChild({ path: 'dot', type: 'ELLIPSE', isFullEllipse: true })),
      ),
    ).toEqual([]);
    expect(
      reasonsAfter((root) =>
        root.children.push(fixedChild({ path: 'arc', type: 'ELLIPSE', isFullEllipse: false })),
      ),
    ).toEqual(['호는 CSS로 그릴 수 없는 모양이다']);
  });

  it('이름 있는 이미지 자산에 없는 이미지를 막는다', () => {
    /**
     * 이미지 칠 스타일을 입힌 자식을 더해 검사한다.
     * @param imageHash 이미지 해시
     * @returns 위반 이유
     */
    function image(imageHash: string): string[] {
      return reasonsAfter((root) =>
        root.children.push(
          fixedChild({
            path: 'wallpaper',
            type: 'RECTANGLE',
            fillStyle: 'Wallpaper',
            fills: [{ type: 'IMAGE', visible: true, blendMode: 'NORMAL', imageHash }],
          }),
        ),
      );
    }
    expect(image('wallpaper-hash')).toEqual([]);
    expect(image('pasted-hash')).toEqual(['칠의 이미지가 이름 있는 이미지 자산에 없다']);
  });

  it('빠진 글꼴과 OpenType 기능을 막는다', () => {
    expect(
      reasonsAfter((root) => {
        const text = must(label(root).text);
        text.hasMissingFont = true;
        text.segments = [segment({ hasOpenTypeFeatures: true })];
      }),
    ).toEqual(['글꼴이 없어 대체 글꼴로 그려진다', '"버튼" 구간에 OpenType 기능이 켜져 있다']);
  });

  it('CSS로 그리지 않는 노드 종류를 막는다', () => {
    expect(
      reasonsAfter((root) => root.children.push(node({ path: 'x', type: 'TEXT_PATH' }))),
    ).toEqual(['노드 종류 TEXT_PATH는 CSS로 그릴 수 없다']);
  });
});

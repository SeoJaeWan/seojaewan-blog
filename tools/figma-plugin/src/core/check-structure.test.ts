import { describe, expect, it } from 'vitest';

import { checkClippingAncestors, type CheckContext, checkVariant } from './check-structure';
import { noCodeVariables } from './code-variables';
import { layerTree } from './layer-tree';
import type { MotionVariable } from './motion-data';
import type { NodeData, ReactionData } from './node-data';
import { buttonRoot, node, segment, sides, solid } from './node-data.fixture';

const context = {
  imageHashes: new Set(['wallpaper-hash']),
};

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

  it('위반에는 레이어 경로·이유·고칠 방법과 피그마에서 보기에 쓸 노드 ID가 있다', () => {
    const root = buttonRoot();
    root.id = '10:1';
    root.fills = [solid()];
    expect(checkVariant(root, 'Button / Rest', context)).toEqual([
      {
        where: 'Button / Rest',
        reason: '단색 칠이 색 변수에 연결되어 있지 않다',
        fix: '칠 색을 색 변수에 연결한다.',
        nodeId: '10:1',
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

  it('변수 없는 고정 크기는 견본 크기라 루트와 안쪽 모두 막지 않는다', () => {
    expect(
      reasonsAfter((root) => {
        must(root.layout).primarySizing = 'FIXED';
        root.children.push(fixedChild({ path: 'icon', type: 'RECTANGLE', width: { value: 16 } }));
      }),
    ).toEqual([]);
  });

  describe('내용 맞춤 축의 크기를 정하는 자식', () => {
    const widthReason =
      '내용 맞춤 너비를 정하는 자식이 없어 너비가 변수 없이 정해진다(자식이 모두 너비에서 부모 채움이거나 절대 위치)';

    /**
     * 루트 최소 너비를 없애고 라벨을 부모 채움 글자로 바꾼다. Flyout처럼 너비가 저장된 값으로만 정해지는 구조다.
     * @param root 루트
     */
    function fillLabel(root: NodeData): void {
      root.minWidth = null;
      const label = must(root.children[0]);
      must(label.text).autoResize = 'HEIGHT';
      must(label.child).sizingHorizontal = 'FILL';
    }

    it('자식이 모두 그 축에서 부모 채움이면 막는다', () => {
      expect(reasonsAfter(fillLabel)).toEqual([widthReason]);
    });

    it('최소 너비가 변수에 연결돼 있으면 크기가 변수로 정해지므로 막지 않는다', () => {
      expect(
        reasonsAfter((root) => {
          fillLabel(root);
          root.minWidth = { value: 120, variable: 'size/button/min-width' };
        }),
      ).toEqual([]);
    });

    it('최대 너비가 변수에 연결돼 있고 부모 채움 글자가 있으면 글자 내용이 너비를 정하므로 막지 않는다', () => {
      expect(
        reasonsAfter((root) => {
          fillLabel(root);
          root.maxWidth = { value: 318, variable: 'size/tooltip/max-width' };
        }),
      ).toEqual([]);
    });

    it('최대 너비가 변수에 연결되지 않았으면 부모 채움 글자가 있어도 막는다', () => {
      const reasons = reasonsAfter((root) => {
        fillLabel(root);
        root.maxWidth = { value: 318 };
      });
      expect(reasons).toContain(widthReason);
    });

    it('최대 너비가 없으면 부모 채움 글자가 있어도 막는다', () => {
      expect(
        reasonsAfter((root) => {
          fillLabel(root);
          root.maxWidth = null;
        }),
      ).toEqual([widthReason]);
    });

    it('쌓는 방향은 자식이 하나라도 정하지 못하면 막고, 고정 크기 자식만으로는 정해졌다고 보지 않는다', () => {
      expect(
        reasonsAfter((root) => {
          fillLabel(root);
          root.children.push(fixedChild({ path: 'icon', type: 'RECTANGLE' }));
        }),
      ).toEqual([widthReason]);
    });

    it('가로지르는 방향은 자식 하나만 정해도 된다', () => {
      expect(
        reasonsAfter((root) => {
          fillLabel(root);
          must(root.layout).mode = 'VERTICAL';
          root.children.push(fixedChild({ path: 'icon', type: 'RECTANGLE' }));
        }),
      ).toEqual([]);
    });

    it('절대 위치 자식은 크기를 정하지 않는다', () => {
      expect(
        reasonsAfter((root) => {
          root.minWidth = null;
          must(root.children[0]).child = {
            sizingHorizontal: 'HUG',
            sizingVertical: 'HUG',
            positioning: 'ABSOLUTE',
            constraints: { horizontal: 'MIN', vertical: 'MIN' },
          };
        }),
      ).toEqual([
        widthReason,
        '내용 맞춤 높이를 정하는 자식이 없어 높이가 변수 없이 정해진다(자식이 모두 높이에서 부모 채움이거나 절대 위치)',
      ]);
    });

    it('부모 채움 자식이어도 안쪽이 고정 크기나 내용 맞춤 글자로 정하면 막지 않는다', () => {
      expect(
        reasonsAfter((root) => {
          root.minWidth = null;
          const wrapper = node({
            path: 'wrapper',
            type: 'FRAME',
            layout: must(root.layout),
            child: {
              sizingHorizontal: 'FILL',
              sizingVertical: 'HUG',
              positioning: 'AUTO',
              constraints: { horizontal: 'MIN', vertical: 'MIN' },
            },
            children: root.children.map((child) => ({ ...child, path: `wrapper/${child.path}` })),
          });
          wrapper.layout = { ...must(root.layout), padding: must(root.layout).padding };
          root.children = [wrapper];
        }),
      ).toEqual([]);
    });
  });

  it('그라데이션과 이미지는 칠 스타일로만, 효과는 효과 스타일로만 쓴다', () => {
    expect(
      reasonsAfter((root) => {
        root.strokeStyle = undefined;
        root.effects = [{ type: 'DROP_SHADOW', isVisible: true, blendMode: 'NORMAL' }];
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
              sourceWidth: 16,
              sourceHeight: 16,
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
          { type: 'NOISE', isVisible: true, blendMode: 'NORMAL' },
          { type: 'TEXTURE', isVisible: true, blendMode: 'NORMAL' },
          {
            type: 'BACKGROUND_BLUR',
            isVisible: true,
            blendMode: 'NORMAL',
            blurType: 'PROGRESSIVE',
          },
          {
            type: 'DROP_SHADOW',
            isVisible: true,
            blendMode: 'MULTIPLY',
            isShadowShownBehindNode: true,
          },
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
        root.fills = [{ type: 'SOLID', isVisible: true, blendMode: 'LUMINOSITY' }];
      }),
    ).toEqual(['칠에 블렌드 LUMINOSITY가 들어 있다(CSS로 그릴 수 없다)']);
  });

  it('점선, 가변 두께 선, 모서리 스무딩, 마스크를 막는다', () => {
    expect(
      reasonsAfter((root) => {
        root.dashPattern = [4, 4];
        root.hasVariableWidthStroke = true;
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
            fills: [{ type: 'IMAGE', isVisible: true, blendMode: 'NORMAL', imageHash }],
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

  it('한글이 든 구간의 글꼴이 Pretendard가 아니면 hasMissingFont가 false여도 막는다', () => {
    expect(
      reasonsAfter((root) => {
        must(label(root).text).segments = [segment({ fontFamily: 'Open Sans' })];
      }),
    ).toEqual(['"버튼" 구간에 한글이 있는데 글꼴이 Open Sans라 대체 글꼴로 그려질 수 있다']);
    expect(
      reasonsAfter((root) => {
        must(label(root).text).segments = [segment({ characters: 'ㄱ', fontFamily: undefined })];
      }),
    ).toHaveLength(1);
  });

  it('한글이 없는 구간은 글꼴과 상관없이, 한글 구간은 Pretendard면 허용한다', () => {
    expect(
      reasonsAfter((root) => {
        must(label(root).text).segments = [
          segment({ characters: 'OK 123', fontFamily: 'Open Sans', textStyle: 'Body' }),
          segment({ characters: '확인', fontFamily: 'Pretendard' }),
        ];
      }),
    ).toEqual([]);
  });

  // @codocs [[디자인 기반:서체]]
  it('코드 서체 NanumGothicCoding은 한글이 들어 있어 한글 구간에도 허용한다', () => {
    expect(
      reasonsAfter((root) => {
        must(label(root).text).segments = [
          segment({ characters: '// 글을 읽어 제목을', fontFamily: 'NanumGothicCoding' }),
        ];
      }),
    ).toEqual([]);
  });

  it('CSS로 그리지 않는 노드 종류를 막는다', () => {
    expect(
      reasonsAfter((root) => root.children.push(node({ path: 'x', type: 'TEXT_PATH' }))),
    ).toEqual(['노드 종류 TEXT_PATH는 CSS로 그릴 수 없다']);
  });
});

/**
 * 덮어쓰기가 있는 인스턴스 노드를 만든다. 노드 ID는 경로다.
 * @param path 레이어 경로
 * @param component 원본 컴포넌트 이름
 * @param overrides 덮어쓴 레이어(ID는 경로)
 * @param children 자식
 * @param scaleFactor 크기 배율
 * @returns 인스턴스 노드 데이터
 */
function instance(
  path: string,
  component: string,
  overrides: { id: string; fields: string[]; changedBindings?: string[] }[],
  children: NodeData[] = [],
  scaleFactor = 1,
): NodeData {
  return node({
    path,
    type: 'INSTANCE',
    instance: {
      component,
      scaleFactor,
      properties: {},
      overrides: overrides.map((item) => ({ changedBindings: [], ...item })),
    },
    children,
  });
}

/**
 * 글자 자식을 만든다.
 * @param path 레이어 경로
 * @returns 글자 노드 데이터
 */
function textChild(path: string): NodeData {
  return node({
    path,
    type: 'TEXT',
    fills: 'mixed',
    text: {
      autoResize: 'WIDTH_AND_HEIGHT',
      hasMissingFont: false,
      truncation: 'DISABLED',
      maxLines: null,
      segments: [segment()],
    },
  });
}

/**
 * 인스턴스를 자식으로 둔 루트를 검사한다.
 * @param child 루트에 넣을 인스턴스
 * @returns 위반 목록
 */
function checkWith(child: NodeData): ReturnType<typeof checkVariant> {
  const root = buttonRoot();
  root.children = [child];
  return checkVariant(root, 'Menu/Folder / Default', context);
}

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 인스턴스 모양의 직접 덮어쓰기', () => {
  it('인스턴스 안 레이어의 칠을 덮어쓰면 위치·이유·고칠 방법을 알린다', () => {
    expect(
      checkWith(
        instance(
          'item',
          'MenuItem',
          [{ id: 'item/label', fields: ['fills', 'characters'] }],
          [textChild('item/label')],
        ),
      ),
    ).toEqual([
      {
        where: 'Menu/Folder / Default / item/label',
        reason: '인스턴스의 칠을 직접 바꿨다(fills)',
        fix: '덮어쓰기를 되돌리고, MenuItem에 변형이나 속성을 열어 그것을 고른다.',
        nodeId: 'item/label',
      },
    ]);
  });

  it('선·선 두께·효과와 스타일 덮어쓰기를 한 레이어에 모아 알린다', () => {
    const reasons = checkWith(
      instance('item', 'MenuItem', [
        {
          id: 'item',
          fields: [
            'strokes',
            'strokeWeight',
            'stokeTopWeight',
            'effects',
            'fillStyleId',
            'strokeStyleId',
            'effectStyleId',
          ],
        },
      ]),
    ).map((violation) => violation.reason);
    expect(reasons).toEqual([
      '인스턴스의 효과 스타일·효과·칠 스타일·선 두께·선 스타일·선을 직접 바꿨다(effectStyleId, effects, fillStyleId, stokeTopWeight, strokeStyleId, strokeWeight, strokes)',
    ]);
  });

  it('모양 필드의 변수 연결을 바꾸면 막고, 크기 변수 연결은 막지 않는다', () => {
    const reasons = checkWith(
      instance('item', 'MenuItem', [
        { id: 'item', fields: ['boundVariables'], changedBindings: ['fills', 'width'] },
      ]),
    ).map((violation) => violation.reason);
    expect(reasons).toEqual(['인스턴스의 칠 변수를 직접 바꿨다(boundVariables.fills)']);
    expect(
      checkWith(
        instance('item', 'MenuItem', [
          { id: 'item', fields: ['boundVariables', 'width'], changedBindings: ['width'] },
        ]),
      ),
    ).toEqual([]);
  });

  it('변형을 바꿔 끼운 인스턴스가 새 원본과 같은 변수면 막지 않고, 다른 변수로 덮어쓰면 막는다', () => {
    function outer(changedBindings: string[]): NodeData {
      return instance(
        'zone',
        'SnapZone',
        [
          { id: 'zone/swapped', fields: ['mainComponent'] },
          { id: 'zone/swapped/rect', fields: ['boundVariables'], changedBindings },
        ],
        [node({ path: 'zone/swapped/rect', type: 'RECTANGLE' })],
      );
    }
    expect(checkWith(outer([]))).toEqual([]);
    expect(checkWith(outer(['fills', 'strokes'])).map((violation) => violation.reason)).toEqual([
      '인스턴스의 칠 변수·선 변수를 직접 바꿨다(boundVariables.fills, boundVariables.strokes)',
    ]);
  });

  it('원본이 속성으로 연 것과 크기·배치 덮어쓰기는 막지 않는다', () => {
    expect(
      checkWith(
        instance(
          'item',
          'MenuItem',
          [
            { id: 'item', fields: ['componentProperties', 'width', 'height', 'layoutGrow'] },
            { id: 'item/label', fields: ['characters', 'visible', 'name', 'textStyleId'] },
          ],
          [textChild('item/label')],
        ),
      ),
    ).toEqual([]);
  });

  it('중첩 인스턴스의 덮어쓰기는 그 레이어를 정의한 원본 컴포넌트로 알리고, 겹친 보고는 하나로 합친다', () => {
    const violations = checkWith(
      instance(
        'menu',
        'Menu',
        [{ id: 'menu/item/label', fields: ['fills'] }],
        [
          instance(
            'menu/item',
            'MenuItem',
            [{ id: 'menu/item/label', fields: ['fills'] }],
            [textChild('menu/item/label')],
          ),
        ],
      ),
    );
    expect(violations).toEqual([
      {
        where: 'Menu/Folder / Default / menu/item/label',
        reason: '인스턴스의 칠을 직접 바꿨다(fills)',
        fix: '덮어쓰기를 되돌리고, MenuItem에 변형이나 속성을 열어 그것을 고른다.',
        nodeId: 'menu/item/label',
      },
    ]);
  });

  it('숨긴 레이어(읽지 않은 레이어)의 덮어쓰기는 보지 않는다', () => {
    expect(
      checkWith(instance('item', 'MenuItem', [{ id: 'item/hidden', fields: ['fills'] }])),
    ).toEqual([]);
  });

  it('줄인 인스턴스는 자기 덮어쓰기만 보고 안쪽은 건너뛴다', () => {
    const scaled = instance(
      'window/preview',
      'Window',
      [
        { id: 'window/preview', fields: ['opacity'] },
        { id: 'window/preview/title', fields: ['fills'] },
      ],
      [textChild('window/preview/title')],
      0.135,
    );
    const reasons = checkWith(
      instance(
        'window',
        'SnapAssist',
        [{ id: 'window/preview/title', fields: ['fills'] }],
        [scaled],
      ),
    ).map((violation) => `${violation.where}: ${violation.reason}`);
    expect(reasons).toEqual([
      'Menu/Folder / Default / window/preview: 인스턴스의 불투명도를 직접 바꿨다(opacity)',
    ]);
  });
});

/**
 * 자산(아이콘) 인스턴스 노드를 만든다. 자산 인스턴스는 안쪽 레이어를 읽지 않는다.
 * @param path 레이어 경로
 * @param overrides 이 인스턴스가 직접 덮어쓴 레이어(ID는 경로 뒤에 `;`로 이은 안쪽 레이어)
 * @returns 자산 인스턴스 노드 데이터
 */
function assetInstance(path: string, overrides: { id: string; fields: string[] }[] = []): NodeData {
  return fixedChild({
    path,
    type: 'INSTANCE',
    asset: {
      name: 'ic_fluent_add_20_regular',
      mainComponentId: '1:1',
      group: 'Icons',
      kind: 'mono',
      sourceWidth: 16,
      sourceHeight: 16,
      problems: [],
    },
    instance: {
      component: 'ic_fluent_add_20_regular',
      scaleFactor: 1,
      properties: {},
      overrides: overrides.map((item) => ({ changedBindings: [], ...item })),
    },
  });
}

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 자산 인스턴스 안쪽의 덮어쓰기', () => {
  it('검사 대상이 직접 놓은 자산 인스턴스의 안쪽 덮어쓰기는 막지 않는다', () => {
    expect(checkWith(assetInstance('icon', [{ id: 'icon;vector', fields: ['fills'] }]))).toEqual(
      [],
    );
  });

  it('다른 인스턴스 안에 든 자산의 안쪽 덮어쓰기도 막지 않는다', () => {
    const button = instance(
      'button',
      'IconButton',
      [{ id: 'button/icon;vector', fields: ['fills', 'strokes', 'opacity'] }],
      [assetInstance('button/icon', [{ id: 'button/icon;vector', fields: ['fills'] }])],
    );
    expect(checkWith(button)).toEqual([]);
  });

  it('다른 인스턴스 안에 든 자산 인스턴스의 색 덮어쓰기는 막지 않고 다른 모양은 막는다', () => {
    /**
     * 자산 인스턴스의 지정한 필드를 덮어쓴 IconButton을 만든다.
     * @param fields 덮어쓴 필드
     * @returns 노드 데이터
     */
    function button(fields: string[]): NodeData {
      return instance(
        'button',
        'IconButton',
        [{ id: 'button/icon', fields }],
        [assetInstance('button/icon')],
      );
    }
    expect(checkWith(button(['fills', 'strokes', 'fillStyleId']))).toEqual([]);
    expect(checkWith(button(['fills', 'effects'])).map((violation) => violation.reason)).toEqual([
      '인스턴스의 효과를 직접 바꿨다(effects)',
    ]);
  });

  it('자산이 아닌 컴포넌트 인스턴스의 칠 덮어쓰기는 계속 막는다', () => {
    const button = instance(
      'button',
      'IconButton',
      [{ id: 'button/label', fields: ['fills'] }],
      [instance('button/label', 'Label', [])],
    );
    expect(checkWith(button).map((violation) => violation.where)).toEqual([
      'Menu/Folder / Default / button/label',
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 인스턴스 전체의 불투명도', () => {
  it('직접 놓은 인스턴스 전체의 불투명도와 그 변수 연결은 막지 않는다', () => {
    expect(
      checkWith(
        instance('folder', 'FileIcon', [
          {
            id: 'folder',
            fields: ['opacity', 'boundVariables'],
            changedBindings: ['opacity'],
          },
        ]),
      ),
    ).toEqual([]);
  });

  it('직접 놓은 인스턴스 안쪽 레이어의 불투명도는 계속 막는다', () => {
    expect(
      checkWith(
        instance(
          'folder',
          'FileIcon',
          [{ id: 'folder/body', fields: ['opacity'] }],
          [node({ path: 'folder/body', type: 'FRAME' })],
        ),
      ).map((violation) => violation.reason),
    ).toEqual(['인스턴스의 불투명도를 직접 바꿨다(opacity)']);
  });

  it('다른 인스턴스 안에 든 인스턴스 전체의 불투명도를 바깥에서 바꾸면 막는다', () => {
    const violations = checkWith(
      instance(
        'menu',
        'Menu',
        [{ id: 'menu/item', fields: ['opacity'] }],
        [instance('menu/item', 'MenuItem', [])],
      ),
    );
    expect(violations).toEqual([
      {
        where: 'Menu/Folder / Default / menu/item',
        reason: '인스턴스의 불투명도를 직접 바꿨다(opacity)',
        fix: '덮어쓰기를 되돌리고, MenuItem에 변형이나 속성을 열어 그것을 고른다.',
        nodeId: 'menu/item',
      },
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 줄인 인스턴스', () => {
  /**
   * 칠이 변수에 연결되지 않은 자식을 만든다.
   * @returns 자식 노드 데이터
   */
  function unlinkedChild(): NodeData {
    return node({ path: 'window/title', type: 'FRAME', fills: [solid()] });
  }

  it('줄인 인스턴스의 안쪽은 변수 미연결 값을 건너뛴다', () => {
    expect(checkWith(instance('window', 'Window', [], [unlinkedChild()], 0.135))).toEqual([]);
  });

  it('줄이지 않은 인스턴스의 안쪽은 변수 미연결 값을 막는다', () => {
    expect(
      checkWith(instance('window', 'Window', [], [unlinkedChild()])).map(
        (violation) => violation.reason,
      ),
    ).toEqual(['단색 칠이 색 변수에 연결되어 있지 않다']);
  });

  /**
   * 고정 크기 배율 인스턴스(진행 링 호 자산처럼 선 두께까지 함께 바뀌는 확대·축소)를 만든다.
   * @param size 배율을 곱한 너비·높이(px)
   * @param scaleFactor 배율
   * @returns 인스턴스 노드 데이터
   */
  function scaledArc(size: number, scaleFactor: number): NodeData {
    const arc = instance('ring/arc', 'progress-ring/Arc', [], [], scaleFactor);
    arc.width = { value: size };
    arc.height = { value: size };
    arc.child = {
      sizingHorizontal: 'FIXED',
      sizingVertical: 'FIXED',
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    };
    return arc;
  }

  it('배율 인스턴스 자체의 고정 크기는 토큰 값이 아니어도 검사하지 않는다', () => {
    expect(checkWith(scaledArc(16, 0.5))).toEqual([]);
    expect(checkWith(scaledArc(134.4, 0.131))).toEqual([]);
    expect(checkWith(scaledArc(172.8, 0.135))).toEqual([]);
  });

  it('배율이 1인 노드의 변수 없는 고정 크기는 견본 크기로 적는다', () => {
    expect(checkWith(scaledArc(16, 1))).toEqual([]);
    expect(layerTree(scaledArc(16, 1), noCodeVariables, false).sampleSize).toEqual([
      'width',
      'height',
    ]);
    expect(layerTree(scaledArc(16, 0.5), noCodeVariables, false).sampleSize).toBeUndefined();
  });

  it('줄인 인스턴스 자체는 계속 검사한다', () => {
    const scaled = instance('window', 'Window', [], [], 0.135);
    scaled.fills = [solid()];
    expect(checkWith(scaled).map((violation) => violation.reason)).toEqual([
      '단색 칠이 색 변수에 연결되어 있지 않다',
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 부모 자동 배치 밖 노드의 크기 판단', () => {
  function frameWith(
    sizing: 'AUTO' | 'FIXED',
    child: Partial<NonNullable<NodeData['child']>> = {},
    parentLayoutMode: NodeData['parentLayoutMode'] = null,
  ): NodeData {
    return node({
      path: 'box',
      type: 'FRAME',
      parentLayoutMode,
      width: { value: 208 },
      height: { value: 164 },
      layout: { ...must(buttonRoot().layout), primarySizing: sizing, counterSizing: sizing },
      child: {
        sizingHorizontal: 'FIXED',
        sizingVertical: 'FIXED',
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        ...child,
      },
    });
  }

  it('부모가 자동 배치가 아니어도 자기 자동 배치가 내용 맞춤이면 위반이 없다', () => {
    expect(reasonsAfter((root) => root.children.push(frameWith('AUTO')))).toEqual([]);
  });

  it('부모가 자동 배치가 아니고 자기 자동 배치가 고정이면 두 축을 견본 크기로 적는다', () => {
    expect(reasonsAfter((root) => root.children.push(frameWith('FIXED')))).toEqual([]);
    expect(layerTree(frameWith('FIXED'), noCodeVariables, false).sampleSize).toEqual([
      'width',
      'height',
    ]);
  });

  it('절대 위치 자식도 자기 자동 배치가 내용 맞춤이면 위반이 없다', () => {
    expect(
      reasonsAfter((root) =>
        root.children.push(frameWith('AUTO', { positioning: 'ABSOLUTE' }, 'HORIZONTAL')),
      ),
    ).toEqual([]);
  });

  it('양쪽 늘이기 축은 자기 자동 배치와 상관없이 부모가 정한 크기로 본다', () => {
    expect(
      reasonsAfter((root) =>
        root.children.push(
          frameWith('FIXED', { constraints: { horizontal: 'STRETCH', vertical: 'MIN' } }),
        ),
      ),
    ).toEqual([]);
    const stretched = frameWith('FIXED', {
      constraints: { horizontal: 'STRETCH', vertical: 'MIN' },
    });
    expect(layerTree(stretched, noCodeVariables, false).sampleSize).toEqual(['height']);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사: 변형을 자르는 조상', () => {
  it('자르기가 꺼진 조상과 섹션·그룹은 위반이 없다', () => {
    expect(
      checkClippingAncestors('Button', [
        { id: '1:1', name: 'Buttons', type: 'SECTION', isClippingContent: false },
        { id: '1:2', name: 'row', type: 'FRAME', isClippingContent: false },
        { id: '1:3', name: 'group', type: 'GROUP', isClippingContent: false },
        { id: '1:4', name: 'Button', type: 'COMPONENT_SET', isClippingContent: false },
      ]),
    ).toEqual([]);
  });

  it('조상이 없으면(페이지 바로 아래 단독 컴포넌트) 위반이 없다', () => {
    expect(checkClippingAncestors('Icon', [])).toEqual([]);
  });

  it('자르는 배치 프레임마다 위치·조상 경로·고칠 방법과 그 프레임의 노드 ID를 대상마다 한 번 돌려준다', () => {
    expect(
      checkClippingAncestors('MessageBox/EmptyRecycleBin', [
        { id: '2:1', name: 'pattern grid', type: 'FRAME', isClippingContent: true },
        { id: '2:2', name: 'row', type: 'FRAME', isClippingContent: true },
        {
          id: '2:3',
          name: 'MessageBox/EmptyRecycleBin',
          type: 'COMPONENT_SET',
          isClippingContent: false,
        },
      ]),
    ).toEqual([
      {
        where: 'MessageBox/EmptyRecycleBin (모든 변형)',
        reason:
          '조상 프레임 `pattern grid`의 Clip content가 켜져 있어 PNG에서 변형의 그림자와 변형 밖으로 나온 자식이 잘린다',
        fix: '프레임 `pattern grid`의 Clip content를 끈다.',
        nodeId: '2:1',
      },
      {
        where: 'MessageBox/EmptyRecycleBin (모든 변형)',
        reason:
          '조상 프레임 `pattern grid / row`의 Clip content가 켜져 있어 PNG에서 변형의 그림자와 변형 밖으로 나온 자식이 잘린다',
        fix: '프레임 `row`의 Clip content를 끈다.',
        nodeId: '2:2',
      },
    ]);
  });

  it('변형을 담은 컴포넌트 세트의 자르기도 막는다', () => {
    expect(
      checkClippingAncestors('WindowFrame', [
        { id: '3:1', name: 'Windows', type: 'SECTION', isClippingContent: false },
        { id: '3:2', name: 'WindowFrame', type: 'COMPONENT_SET', isClippingContent: true },
      ]),
    ).toEqual([
      {
        where: 'WindowFrame (모든 변형)',
        reason:
          '조상 컴포넌트 세트 `Windows / WindowFrame`의 Clip content가 켜져 있어 PNG에서 변형의 그림자와 변형 밖으로 나온 자식이 잘린다',
        fix: '컴포넌트 세트 `WindowFrame`의 Clip content를 끈다.',
        nodeId: '3:2',
      },
    ]);
  });

  it('섹션은 자르기 값이 켜져 있다고 읽혀도 대상이 아니다', () => {
    expect(
      checkClippingAncestors('Button', [
        { id: '4:1', name: 'Buttons', type: 'SECTION', isClippingContent: true },
      ]),
    ).toEqual([]);
  });
});

/**
 * 이미지 자산 인스턴스를 만든다.
 * @param overrides 바꿀 값
 * @returns 노드 데이터
 */
function imageAsset(overrides: Partial<NodeData>): NodeData {
  return node({
    path: 'image',
    type: 'INSTANCE',
    asset: {
      name: 'wallpaper/Bloom',
      mainComponentId: 'main',
      group: 'Images',
      kind: 'raster',
      sourceWidth: 480,
      sourceHeight: 300,
      problems: [],
    },
    ...overrides,
  });
}

/**
 * 크기를 변수에 연결한 변형 루트를 만든다.
 * @param overrides 바꿀 값
 * @returns 변형 루트
 */
function fixedRoot(overrides: Partial<NodeData>): NodeData {
  return node({
    path: '',
    type: 'COMPONENT',
    child: null,
    width: { value: 16, variable: 'size/16' },
    height: { value: 16, variable: 'size/16' },
    ...overrides,
  });
}

/**
 * 변형 루트 아래에 노드를 두고 위반 이유를 모은다.
 * @param child 검사할 노드
 * @param extra 더할 검사 정보
 * @returns 위반 이유
 */
function reasonsOf(child: NodeData, extra: Partial<CheckContext> = {}): string[] {
  return checkVariant(fixedRoot({ children: [child] }), 'Figure', { ...context, ...extra }).map(
    (violation) => violation.reason,
  );
}

// @codocs [[피그마 연동:구조 검사]]
describe('이미지 자산 비율', () => {
  it('비율이 원본과 다른 이미지 자산을 막는다', () => {
    const reasons = reasonsOf(
      imageAsset({
        width: { value: 720, variable: 'size/720' },
        height: { value: 420, variable: 'size/420' },
      }),
    );
    expect(reasons.some((reason) => reason.includes('비율이 원본과 다르다'))).toBe(true);
  });

  it('비율을 잠근 FILL 이미지의 높이는 변수 없는 고정 높이로 막지 않는다', () => {
    const reasons = reasonsOf(
      imageAsset({
        width: { value: 720 },
        height: { value: 450 },
        aspectRatio: 1.6,
        child: {
          sizingHorizontal: 'FILL',
          sizingVertical: 'FIXED',
          positioning: 'AUTO',
          constraints: { horizontal: 'MIN', vertical: 'MIN' },
        },
      }),
    );
    expect(reasons).toEqual([]);
  });

  it('비율을 잠갔어도 어느 축도 정해지지 않으면 두 축을 견본 크기로 적는다', () => {
    const reasons = reasonsOf(
      imageAsset({
        width: { value: 720 },
        height: { value: 450 },
        aspectRatio: 1.6,
        child: {
          sizingHorizontal: 'FIXED',
          sizingVertical: 'FIXED',
          positioning: 'AUTO',
          constraints: { horizontal: 'MIN', vertical: 'MIN' },
        },
      }),
    );
    expect(reasons).toEqual([]);
    const locked = imageAsset({
      width: { value: 720 },
      height: { value: 450 },
      aspectRatio: 1.6,
      child: {
        sizingHorizontal: 'FIXED',
        sizingVertical: 'FIXED',
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
      },
    });
    expect(layerTree(locked, noCodeVariables, false).sampleSize).toEqual(['width', 'height']);
  });

  it('두 축을 부모가 정하면 틀에 맞춰 자르는 그림이라 막지 않는다', () => {
    const reasons = reasonsOf(
      imageAsset({
        width: { value: 720 },
        height: { value: 240 },
        child: {
          sizingHorizontal: 'FILL',
          sizingVertical: 'FILL',
          positioning: 'AUTO',
          constraints: { horizontal: 'MIN', vertical: 'MIN' },
        },
      }),
    );
    expect(reasons).toEqual([]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('코드 전용 변수 짝', () => {
  const codeVariables = {
    rotate: [{ name: 'rotate/quarter', value: 90 }],
    lineClamp: [{ name: 'line-clamp/two', value: 2 }],
    ratio: [{ name: 'ratio/wide', value: 1.6 }],
  };

  it('묶음에 변수가 없으면 짝을 보지 않는다', () => {
    expect(reasonsOf(node({ path: 'a', type: 'FRAME', rotation: -180 }))).toEqual([]);
  });

  it('피그마 회전은 부호를 뒤집어 CSS 각도로 짝짓는다', () => {
    expect(reasonsOf(node({ path: 'a', type: 'FRAME', rotation: -90 }), { codeVariables })).toEqual(
      [],
    );
    expect(reasonsOf(node({ path: 'a', type: 'FRAME', rotation: 90 }), { codeVariables })).toEqual([
      '회전 90°와 같은 값의 코드 전용 변수가 없다',
    ]);
  });

  it('비율에 짝이 없으면 막는다', () => {
    expect(
      reasonsOf(node({ path: 'a', type: 'FRAME', aspectRatio: 2 }), { codeVariables }),
    ).toEqual(['비율 2.000와 같은 값의 코드 전용 변수가 없다']);
  });

  it('둘 이상의 최대 줄 수만 짝을 찾는다. 한 줄 말줄임은 truncate다', () => {
    /**
     * 최대 줄 수가 있는 글자를 만든다.
     * @param maxLines 최대 줄 수
     * @returns 노드 데이터
     */
    function text(maxLines: number): NodeData {
      return node({
        path: 'a',
        type: 'TEXT',
        text: {
          autoResize: 'HEIGHT',
          hasMissingFont: false,
          truncation: 'ENDING',
          maxLines,
          segments: [],
        },
      });
    }
    expect(reasonsOf(text(1), { codeVariables })).toEqual([]);
    expect(reasonsOf(text(2), { codeVariables })).toEqual([]);
    expect(reasonsOf(text(3), { codeVariables })).toEqual([
      '최대 줄 수 3와 같은 값의 코드 전용 변수가 없다',
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('다이아몬드 그라데이션', () => {
  it('구조 검사가 막는다', () => {
    const reasons = reasonsOf(
      node({
        path: 'a',
        type: 'FRAME',
        fillStyle: 'Diamond',
        fills: [{ type: 'GRADIENT_DIAMOND', isVisible: true, blendMode: 'NORMAL' }],
      }),
    );
    expect(reasons).toEqual(['칠 종류 GRADIENT_DIAMOND는 CSS로 그릴 수 없다']);
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('변형 전환', () => {
  const motionVariables: MotionVariable[] = [
    { name: 'motion/duration/faster', resolvedType: 'FLOAT', value: 83 },
    { name: 'motion/easing/fade', resolvedType: 'EASING', value: null, curve: [0, 0, 1, 1] },
  ];

  /**
   * 전환이 있는 변형을 검사한다.
   * @param reaction 전환
   * @returns 위반 이유
   */
  function check(reaction: ReactionData): string[] {
    return checkVariant(fixedRoot({ reactions: [reaction] }), 'SearchBox', {
      ...context,
      motionVariables,
    }).map((violation) => violation.reason);
  }

  const hover: ReactionData = {
    trigger: 'ON_HOVER',
    destination: 'State=Hover',
    navigation: 'CHANGE_TO',
    transition: {
      type: 'SMART_ANIMATE',
      durationMs: 83,
      easing: { type: 'LINEAR', bezier: [0, 0, 1, 1] },
    },
  };

  it('모션 변수 값이면 막지 않는다', () => {
    expect(check(hover)).toEqual([]);
  });

  it('모션 변수 값이 아닌 시간과 이징을 막는다', () => {
    const reasons = check({
      ...hover,
      transition: {
        type: 'SMART_ANIMATE',
        durationMs: 100,
        easing: { type: 'EASE_OUT', bezier: null },
      },
    });
    expect(reasons).toHaveLength(2);
  });

  it('트리거는 읽지 않는다. Focused 변형으로 가는 전환도 시간·이징만 본다', () => {
    const focused = { ...hover, trigger: 'ON_CLICK', destination: 'Filled=False, State=Focused' };
    expect(check(focused)).toEqual([]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
// @codocs [[디자인 시스템:조립]]
describe('구조 검사: 조립', () => {
  /**
   * 고정 크기 조립 루트를 만든다. 자식은 넘긴 노드다.
   * @param children 자식
   * @returns 루트
   */
  function patternRoot(children: NodeData[]): NodeData {
    return node({
      path: '',
      type: 'COMPONENT',
      parentLayoutMode: null,
      child: null,
      width: { value: 1280 },
      height: { value: 720 },
      children,
    });
  }

  /**
   * 크기 변수에 연결한 고정 크기 배치 프레임을 만든다.
   * @param overrides 바꿀 값
   * @returns 노드 데이터
   */
  function frame(overrides: Partial<NodeData> & Pick<NodeData, 'path'>): NodeData {
    return fixedChild({ type: 'FRAME', ...overrides });
  }

  /**
   * 칠을 가진 배치 프레임을 만든다.
   * @param path 레이어 경로
   * @returns 노드 데이터
   */
  function filledFrame(path: string): NodeData {
    return frame({ path, fills: [solid('layer-fill/default')] });
  }

  /**
   * 조립으로 검사한 위반 이유를 돌려준다.
   * @param root 루트
   * @param kind 대상 종류
   * @returns 위반 이유 목록
   */
  function patternReasons(root: NodeData, kind: 'component' | 'pattern' = 'pattern'): string[] {
    return checkVariant(root, 'Explorer/Content / Default', context, kind).map(
      (violation) => violation.reason,
    );
  }

  it('조립이 직접 놓은 배치 프레임의 칠·선·효과를 막는다', () => {
    const body = frame({
      path: 'body',
      fills: [solid('layer-fill/default')],
      strokes: [solid('card-stroke/default')],
      strokeWeight: sides({ value: 1, variable: 'stroke-width/default' }),
    });
    const shadow = frame({
      path: 'shadow',
      effects: [{ type: 'DROP_SHADOW', isVisible: true, blendMode: 'NORMAL' }],
      effectStyle: 'Elevation/Card',
    });
    expect(patternReasons(patternRoot([body, shadow]))).toEqual([
      '조립의 배치 프레임이 칠·선을 가진다',
      '조립의 배치 프레임이 효과를 가진다',
    ]);
    expect(patternReasons(patternRoot([body, shadow]), 'component')).toEqual([]);
  });

  it('숨긴 칠·선·효과와 프레임이 아닌 레이어는 보지 않는다', () => {
    const hidden = frame({
      path: 'hidden',
      fills: [{ ...solid('layer-fill/default'), isVisible: false }],
    });
    const rectangle = fixedChild({
      path: 'background',
      type: 'RECTANGLE',
      fills: [solid('layer-fill/default')],
    });
    expect(patternReasons(patternRoot([hidden, rectangle]))).toEqual([]);
  });

  it('인스턴스 안쪽 프레임은 보지 않고, 슬롯 안에 조립이 놓은 프레임은 본다', () => {
    const slot = node({
      path: 'Card/Content',
      type: 'SLOT',
      children: [filledFrame('Card/Content/row')],
    });
    const card = node({
      path: 'Card',
      type: 'INSTANCE',
      instance: { component: 'LayerSurface', scaleFactor: 1, properties: {}, overrides: [] },
      children: [filledFrame('Card/surface'), slot],
    });
    const violations = checkVariant(
      patternRoot([card]),
      'Explorer/Content / Default',
      context,
      'pattern',
    );
    expect(violations.map((violation) => violation.where)).toEqual([
      'Explorer/Content / Default / Card/Content/row',
    ]);
  });

  it('조립 루트의 고정 너비·높이는 변수 없는 숫자로 둘 수 있다', () => {
    expect(patternReasons(patternRoot([]))).toEqual([]);
  });

  it('조립 안의 크기(루트, 인스턴스 크기 덮어쓰기, 배치 프레임의 고정·최소·최대 크기)는 변수 없는 숫자로 둘 수 있다', () => {
    const shell = node({
      path: 'ShellSurface',
      type: 'INSTANCE',
      width: { value: 642 },
      height: { value: 726 },
      child: {
        sizingHorizontal: 'FIXED',
        sizingVertical: 'FIXED',
        positioning: 'AUTO',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
      },
      instance: { component: 'ShellSurface', scaleFactor: 1, properties: {}, overrides: [] },
    });
    const root = patternRoot([frame({ path: 'top space', height: { value: 96 } }), shell]);
    root.maxWidth = { value: 1600 };
    expect(patternReasons(root)).toEqual([]);
  });

  it('조립 안의 간격·여백은 그대로 변수에 연결해야 한다', () => {
    const row = frame({
      path: 'row',
      layout: {
        mode: 'HORIZONTAL',
        wrap: 'NO_WRAP',
        primaryAlign: 'MIN',
        counterAlign: 'MIN',
        primarySizing: 'FIXED',
        counterSizing: 'FIXED',
        padding: sides({ value: 12 }),
        itemSpacing: { value: 8 },
        counterAxisSpacing: null,
      },
      children: [frame({ path: 'row/a' }), frame({ path: 'row/b' })],
    });
    expect(patternReasons(patternRoot([row]))).toEqual([
      '여백(top) 12가 변수에 연결되어 있지 않다',
      '여백(right) 12가 변수에 연결되어 있지 않다',
      '여백(bottom) 12가 변수에 연결되어 있지 않다',
      '여백(left) 12가 변수에 연결되어 있지 않다',
      '간격 8가 변수에 연결되어 있지 않다',
    ]);
  });
});

// @codocs [[피그마 연동:구조 검사]]
// @codocs [[디자인 기반:크기 변수]]
describe('구조 검사: 견본 크기(변수 연결 여부)', () => {
  it('변수 없는 고정 크기는 견본 크기라 루트와 안쪽 레이어 모두 막지 않는다', () => {
    const root = node({
      path: '',
      type: 'COMPONENT',
      parentLayoutMode: null,
      child: null,
      width: { value: 320 },
      height: { value: 40 },
      children: [fixedChild({ path: 'icon', type: 'RECTANGLE', width: { value: 16 } })],
    });
    expect(checkVariant(root, 'FileRow / Default', context)).toEqual([]);
  });

  it('주석은 `@` 줄로 읽지 않는다', () => {
    const root = node({
      path: '',
      type: 'COMPONENT',
      parentLayoutMode: null,
      child: null,
      annotations: [{ text: '@sample-size depth', category: 'Development' }],
    });
    expect(checkVariant(root, 'Equation / Default', context)).toEqual([]);
  });
});

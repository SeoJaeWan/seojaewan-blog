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
    text: { autoResize: 'WIDTH_AND_HEIGHT', hasMissingFont: false, segments: [segment()] },
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
      problems: [],
    },
    instance: {
      component: 'ic_fluent_add_20_regular',
      scaleFactor: 1,
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

  it('부모가 자동 배치가 아니고 자기 자동 배치가 고정이면 여전히 위반이다', () => {
    expect(reasonsAfter((root) => root.children.push(frameWith('FIXED')))).toEqual([
      '고정 너비 208가 크기 변수에 연결되어 있지 않다',
      '고정 높이 164가 크기 변수에 연결되어 있지 않다',
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
    ).toEqual(['고정 높이 164가 크기 변수에 연결되어 있지 않다']);
  });
});

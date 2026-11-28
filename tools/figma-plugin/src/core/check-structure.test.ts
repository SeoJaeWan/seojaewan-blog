import { describe, expect, it } from 'vitest';

import type { BehaviorSpec } from '../../../../packages/design-system/src/figma-contract';
import { checkComponent, checkVariant } from './check-structure';
import type { NodeData } from './node-data';
import {
  buttonRoot,
  component,
  dimension,
  iconAsset,
  instance,
  node,
  segment,
  solid,
  text,
  variant,
} from './node-data.fixture';

// 가짜 동작 등록부. 등록부가 비어 있는 지금도 검사를 시험하려고 종류 둘을 넣는다.
const buttonSpec: BehaviorSpec = {
  name: 'button',
  roles: [
    {
      role: 'root',
      selector: { kind: 'root' },
      isRequired: true,
      isMultiple: false,
      tag: 'button',
    },
    {
      role: 'label',
      selector: { kind: 'text-property' },
      isRequired: true,
      isMultiple: false,
      tag: null,
    },
  ],
  stateWords: [
    { word: 'Rest', condition: null, target: 'root', codeName: null },
    {
      word: 'Hover',
      condition: { kind: 'pseudo-class', name: 'hover' },
      target: 'root',
      codeName: null,
    },
  ],
  axes: [],
  event: { inputName: 'onClick', nestedSuffix: '' },
  runtimeValues: [],
};
const checkboxSpec: BehaviorSpec = {
  name: 'checkbox',
  roles: [
    { role: 'root', selector: { kind: 'root' }, isRequired: true, isMultiple: false, tag: null },
    {
      role: 'indicator',
      selector: { kind: 'indicator' },
      isRequired: true,
      isMultiple: false,
      tag: null,
    },
    {
      role: 'close',
      selector: { kind: 'layer-name', names: ['close button', 'icon'] },
      isRequired: false,
      isMultiple: false,
      tag: null,
    },
  ],
  stateWords: [{ word: 'Rest', condition: null, target: 'root', codeName: null }],
  axes: [
    {
      kind: 'on-off',
      codeName: 'isChecked',
      target: 'root',
      condition: { kind: 'aria', attribute: 'aria-checked', value: 'true' },
    },
  ],
  event: null,
  runtimeValues: [],
};
const specs = [buttonSpec, checkboxSpec];

/**
 * 가짜 동작 등록부에서 종류를 찾는다.
 * @param name 종류 이름
 * @returns 종류 규칙
 */
function fakeRegistry(name: string): BehaviorSpec | undefined {
  return specs.find((spec) => spec.name === name);
}

/**
 * Button 루트의 자식을 바꾼 변형 하나를 검사한다.
 * @param children 루트 자식
 * @returns 위반 이유
 */
function reasonsOf(children: NodeData[]): string[] {
  return checkVariant(variant('V', {}, { ...buttonRoot(), children }), 'Button / V').map(
    (violation) => violation.reason,
  );
}

// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: 토큰 없는 값', () => {
  it('변수·스타일에 연결된 정상 구조는 위반이 없다', () => {
    expect(checkComponent(component(), fakeRegistry)).toEqual([]);
  });

  it('위반에는 레이어 키·이유·고칠 방법과 피그마에서 보기에 쓸 노드 ID가 있다', () => {
    const [violation] = checkVariant(
      variant(
        'V',
        {},
        { ...buttonRoot(), children: [node({ key: 'box', type: 'FRAME', fills: [solid()] })] },
      ),
      'Button / V',
    );
    expect(violation).toEqual({
      where: 'Button / V / box',
      reason: '단색 칠이 색 변수에 연결되어 있지 않다',
      fix: '칠 색을 색 변수에 연결한다.',
      nodeId: 'box',
    });
  });

  it('여백·간격·선 두께·반경이 변수에 연결되지 않으면 막는다. 크기 숫자는 막지 않는다', () => {
    const box = node({
      key: 'box',
      type: 'FRAME',
      width: { value: 37 },
      minWidth: { value: 10 },
      strokes: [solid('Black/6')],
      strokeWeight: {
        top: { value: 1 },
        right: { value: 0 },
        bottom: { value: 0 },
        left: { value: 0 },
      },
      radius: {
        topLeft: { value: 3 },
        topRight: { value: 0 },
        bottomRight: { value: 0 },
        bottomLeft: { value: 0 },
      },
      layout: {
        mode: 'VERTICAL',
        wrap: 'NO_WRAP',
        primaryAlign: 'MIN',
        counterAlign: 'MIN',
        counterAlignContent: 'AUTO',
        padding: {
          top: { value: 4 },
          right: { value: 0 },
          bottom: { value: 0 },
          left: { value: 0 },
        },
        itemSpacing: { value: 2 },
        counterAxisSpacing: null,
        isReversingZIndex: false,
      },
      children: [node({ key: 'box/a', type: 'FRAME' }), node({ key: 'box/b', type: 'FRAME' })],
    });
    expect(reasonsOf([box])).toEqual([
      '선 두께(top) 1가 변수에 연결되어 있지 않다',
      '반경(topLeft) 3가 변수에 연결되어 있지 않다',
      '여백(top) 4가 변수에 연결되어 있지 않다',
      '간격 2가 변수에 연결되어 있지 않다',
    ]);
  });

  it('그라데이션은 칠 스타일로만, 효과는 효과 스타일로만 쓴다', () => {
    expect(
      reasonsOf([
        node({
          key: 'box',
          type: 'FRAME',
          fills: [{ type: 'GRADIENT_LINEAR', isVisible: true, blendMode: 'NORMAL', opacity: 1 }],
          effects: [{ type: 'DROP_SHADOW', isVisible: true, blendMode: 'NORMAL' }],
        }),
      ]),
    ).toEqual([
      'GRADIENT_LINEAR 칠이 스타일에 연결되어 있지 않다',
      '효과가 효과 스타일에 연결되어 있지 않다',
    ]);
  });

  it('글자는 스타일에 연결해야 하고, 덮어쓰거나 한 레이어에 스타일이 둘 이상 섞이면 막는다', () => {
    const label = node({
      key: 'label',
      type: 'TEXT',
      text: text({
        segments: [
          segment({ characters: '굵게', textStyle: 'Body Strong' }),
          segment({ characters: '보통', overrides: ['fontSize'] }),
          segment({ characters: '없음', textStyle: undefined }),
        ],
      }),
    });
    expect(reasonsOf([label])).toEqual([
      '글자 레이어 하나에 글자 스타일이 3개 섞여 있다',
      '"보통" 구간이 글자 스타일을 덮어썼다(fontSize)',
      '"없음" 구간에 글자 스타일이 없다',
    ]);
  });

  it('한 가지 색 자산의 색이 색 변수 하나로 정해지지 않으면 막는다', () => {
    const icon = node({
      key: 'icon',
      type: 'INSTANCE',
      asset: iconAsset({ problems: ['한 가지 색 자산의 색이 색 변수에 연결되어 있지 않다'] }),
      instance: instance(),
    });
    expect(reasonsOf([icon])).toEqual([
      '자산 Icons/ic_fluent_add_20_regular: 한 가지 색 자산의 색이 색 변수에 연결되어 있지 않다',
    ]);
  });
});

// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: CSS로 그릴 수 없는 기능', () => {
  it('노이즈·텍스처·점진 블러 효과, 블렌드 효과, 투명한 부분 뒤 그림자를 막는다', () => {
    const box = node({
      key: 'box',
      type: 'FRAME',
      effectStyle: 'Elevation/Flyout',
      effects: [
        { type: 'NOISE', isVisible: true, blendMode: 'NORMAL' },
        { type: 'BACKGROUND_BLUR', isVisible: true, blendMode: 'NORMAL', blurType: 'PROGRESSIVE' },
        {
          type: 'DROP_SHADOW',
          isVisible: true,
          blendMode: 'MULTIPLY',
          isShadowShownBehindNode: true,
        },
      ],
    });
    expect(reasonsOf([box])).toEqual([
      '효과 NOISE는 CSS로 그릴 수 없다',
      '흐림 PROGRESSIVE는 CSS로 그릴 수 없다',
      '효과에 블렌드 MULTIPLY가 들어 있다(CSS로 그릴 수 없다)',
      '그림자 "투명한 부분 뒤에도 표시"는 CSS로 그릴 수 없다',
    ]);
  });

  it('점선, 가변 두께 선, 모서리 스무딩, 마스크, 90° 단위가 아닌 회전을 막는다', () => {
    const box = node({
      key: 'box',
      type: 'FRAME',
      strokes: [solid('Black/6')],
      strokeWeight: {
        top: dimension(1, 'stroke-width/default'),
        right: dimension(1, 'stroke-width/default'),
        bottom: dimension(1, 'stroke-width/default'),
        left: dimension(1, 'stroke-width/default'),
      },
      dashPattern: [2, 2],
      hasVariableWidthStroke: true,
      cornerSmoothing: 0.6,
      isMask: true,
      rotation: 45,
    });
    expect(reasonsOf([box])).toEqual([
      '회전 45°는 90° 단위가 아니다',
      '마스크는 CSS로 그릴 수 없다',
      '점선은 CSS로 같게 그릴 수 없다',
      '가변 두께·브러시 선은 CSS로 그릴 수 없다',
      '모서리 스무딩은 CSS로 그릴 수 없다',
    ]);
  });

  it('90° 단위 회전은 허용한다', () => {
    expect(reasonsOf([node({ key: 'box', type: 'FRAME', rotation: -90 })])).toEqual([]);
  });

  it('자산이 아닌 벡터와 원·타원을 막고, CSS로 그리지 않는 노드 종류를 막는다', () => {
    expect(
      reasonsOf([
        node({ key: 'v', type: 'VECTOR' }),
        node({ key: 'dot', type: 'ELLIPSE' }),
        node({ key: 'sticker', type: 'STICKY' }),
      ]),
    ).toEqual([
      'VECTOR는 자산이 아닌 도형이라 CSS로 그릴 수 없다',
      'ELLIPSE는 자산이 아닌 도형이라 CSS로 그릴 수 없다',
      '노드 종류 STICKY는 CSS로 그릴 수 없다',
    ]);
  });

  it('이름 있는 이미지 자산에 없는 이미지와 맞춤 방식 CROP·TILE 이미지 칠을 막는다', () => {
    /**
     * 이미지 칠을 가진 사각형을 만든다.
     * @param scaleMode 맞춤 방식
     * @param isNamed 이름 있는 자산의 이미지인지
     * @returns 노드
     */
    function image(scaleMode: string, isNamed: boolean): NodeData {
      return node({
        key: `img-${scaleMode}`,
        type: 'RECTANGLE',
        fills: [
          {
            type: 'IMAGE',
            isVisible: true,
            blendMode: 'NORMAL',
            opacity: 1,
            imageHash: 'h',
            scaleMode,
            imageAsset: isNamed ? { group: 'Images', name: 'a', file: 'images/a' } : null,
          },
        ],
      });
    }
    expect(reasonsOf([image('FILL', true), image('CROP', true), image('FIT', false)])).toEqual([
      '이미지 칠의 맞춤 방식 CROP는 CSS로 옮길 수 없다',
      '칠의 이미지가 이름 있는 이미지 자산에 없다',
    ]);
  });

  it('이미지 자산 인스턴스의 맞춤 방식 TILE을 막는다', () => {
    const photo = node({
      key: 'photo',
      type: 'INSTANCE',
      asset: iconAsset({ group: 'Images', kind: 'raster', color: null, scaleMode: 'TILE' }),
      instance: instance(),
    });
    expect(reasonsOf([photo])).toEqual(['이미지 칠의 맞춤 방식 TILE는 CSS로 옮길 수 없다']);
  });

  it('빠진 글꼴과 OpenType 기능을 막는다', () => {
    const label = node({
      key: 'label',
      type: 'TEXT',
      text: text({ hasMissingFont: true, segments: [segment({ hasOpenTypeFeatures: true })] }),
    });
    expect(reasonsOf([label])).toEqual([
      '글꼴이 없어 대체 글꼴로 그려진다',
      '"버튼" 구간에 OpenType 기능이 켜져 있다',
    ]);
  });

  it('스키마 꼴에 없는 주축 정렬(SPACE_EVENLY)을 막는다', () => {
    const root = buttonRoot();
    if (root.layout === null) {
      throw new Error('fixture');
    }
    const violations = checkVariant(
      variant('V', {}, { ...root, layout: { ...root.layout, primaryAlign: 'SPACE_EVENLY' } }),
      'Button / V',
    );
    expect(violations.map((violation) => violation.reason)).toEqual([
      '주축 정렬 SPACE_EVENLY는 스키마 꼴에 없어 내보낼 수 없다',
    ]);
  });
});

// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: 숨긴 레이어', () => {
  it('켜고 끄는 속성에 묶이지 않은 숨긴 레이어를 막는다', () => {
    expect(reasonsOf([node({ key: 'ghost', type: 'FRAME', isVisible: false })])).toEqual([
      '숨긴 레이어가 켜고 끄는 속성에 묶여 있지 않다',
    ]);
  });

  it('숨긴 레이어도 토큰 값을 검사한다(속성을 켜면 그려진다)', () => {
    const hidden = node({
      key: 'badge',
      type: 'FRAME',
      isVisible: false,
      propertyRefs: { visible: 'Has badge#1:0' },
      fills: [solid()],
    });
    expect(reasonsOf([hidden])).toEqual(['단색 칠이 색 변수에 연결되어 있지 않다']);
  });

  it('품은 인스턴스 안쪽의 숨긴 레이어는 보지 않는다', () => {
    const inner = node({
      key: 'button/ghost',
      type: 'FRAME',
      isVisible: false,
      isInsideInstance: true,
      fills: [solid()],
    });
    const button = node({
      key: 'button',
      type: 'INSTANCE',
      instance: instance(),
      children: [inner],
    });
    expect(reasonsOf([button])).toEqual([]);
  });
});

// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: 모양 덮어쓰기', () => {
  it('인스턴스 안 레이어의 칠·효과가 원본과 다르면 막는다', () => {
    const inner = node({ key: 'button/label', type: 'TEXT', isInsideInstance: true, text: text() });
    const button = node({
      key: 'button',
      type: 'INSTANCE',
      instance: instance({ overrides: [{ id: 'button/label', fields: ['effects', 'fills'] }] }),
      children: [inner],
    });
    const [violation] = checkVariant(
      variant('V', {}, { ...buttonRoot(), children: [button] }),
      'Button / V',
    );
    expect(violation).toEqual({
      where: 'Button / V / button/label',
      reason: '인스턴스의 효과·칠을 원본과 다르게 바꿨다(effects, fills)',
      fix: '덮어쓰기를 되돌리고, Button에 변형이나 속성을 열어 그것을 고른다.',
      nodeId: 'button/label',
    });
  });

  it('자산 인스턴스(와 그 안쪽)의 색, 자산 인스턴스 전체의 불투명도는 허용한다', () => {
    const icon = node({
      key: 'button/icon',
      type: 'INSTANCE',
      isInsideInstance: true,
      asset: iconAsset(),
      instance: instance(),
    });
    const button = node({
      key: 'button',
      type: 'INSTANCE',
      instance: instance({
        overrides: [
          { id: 'button/icon', fields: ['boundVariables.fills', 'opacity'] },
          { id: 'button/icon;path', fields: ['fills'] },
        ],
      }),
      children: [icon],
    });
    expect(reasonsOf([button])).toEqual([]);
  });

  it('자산 안쪽 레이어의 불투명도와 자산이 아닌 인스턴스 전체의 불투명도는 막는다', () => {
    const icon = node({
      key: 'button/icon',
      type: 'INSTANCE',
      isInsideInstance: true,
      asset: iconAsset(),
      instance: instance(),
    });
    const button = node({
      key: 'button',
      type: 'INSTANCE',
      instance: instance({
        overrides: [
          { id: 'button/icon;path', fields: ['opacity'] },
          { id: 'button', fields: ['opacity'] },
        ],
      }),
      children: [icon],
    });
    expect(reasonsOf([button])).toEqual([
      '인스턴스의 불투명도를 원본과 다르게 바꿨다(opacity)',
      '인스턴스의 불투명도를 원본과 다르게 바꿨다(opacity)',
    ]);
  });

  it('크기를 줄인 인스턴스는 안쪽을 건너뛴다', () => {
    const inner = node({
      key: 'tile/box',
      type: 'FRAME',
      isInsideInstance: true,
      fills: [solid()],
    });
    const tile = node({
      key: 'tile',
      type: 'INSTANCE',
      instance: instance({ scaleFactor: 0.5 }),
      children: [inner],
    });
    expect(reasonsOf([tile])).toEqual([]);
    expect(reasonsOf([{ ...tile, instance: instance() }])).toEqual([
      '단색 칠이 색 변수에 연결되어 있지 않다',
    ]);
  });
});

// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: 읽을 수 없는 구조', () => {
  it('이름이 같은 컴포넌트가 둘 이상이면 막는다', () => {
    expect(checkComponent(component({ sameNameCount: 2 }), fakeRegistry)[0]?.reason).toBe(
      '이름이 같은 컴포넌트가 2개 있다',
    );
  });

  it('입력의 역할이 되는 레이어(속성에 묶인 레이어)끼리 이름이 같으면 막고, 그 밖의 레이어는 막지 않는다', () => {
    const labels = [
      node({ key: 'label', type: 'TEXT', text: text(), propertyRefs: { characters: 'A#1:0' } }),
      node({
        key: 'label[2]',
        name: 'label',
        type: 'TEXT',
        text: text(),
        propertyRefs: { characters: 'B#1:1' },
      }),
      node({ key: 'box', type: 'FRAME' }),
      node({ key: 'box[2]', name: 'box', type: 'FRAME' }),
    ];
    expect(reasonsOf(labels)).toEqual(['입력이나 동작의 역할이 되는 레이어 `label`가 2개다']);
  });

  it('옮기는 속성 밖의 키프레임을 막는다', () => {
    const moving = {
      ...variant('V', {}),
      motionProblems: [
        {
          nodeId: 'motion',
          layer: 'motion',
          property: 'WIDTH',
          reason: '옮기는 속성 밖의 WIDTH 키프레임이다',
        },
      ],
    };
    expect(checkVariant(moving, 'Button / V').map((violation) => violation.where)).toEqual([
      'Button / V / motion',
    ]);
  });
});

// @codocs [[디자인 시스템:동작의 종류]]
// @codocs [[디자인 시스템:구조 검사]]
describe('구조 검사: 동작의 종류', () => {
  it('적힌 종류가 등록부에 없으면 막는다', () => {
    const reasons = checkComponent(component({ behavior: 'menuitem' }), fakeRegistry).map(
      (violation) => violation.reason,
    );
    expect(reasons).toEqual(['적힌 동작의 종류 `menuitem`가 동작 등록부에 없다']);
  });

  it('등록부가 비어 있으면 종류가 적힌 컴포넌트는 모두 막힌다', () => {
    expect(checkComponent(component({ behavior: 'button' }), () => undefined)).toHaveLength(1);
  });

  it('종류가 요구하는 역할 레이어가 없는 변형을 막는다', () => {
    const noLabel = variant('Variant=Icon', { Variant: 'Icon' }, { ...buttonRoot(), children: [] });
    const reasons = checkComponent(
      component({
        behavior: 'button',
        variants: [variant('Variant=Text', { Variant: 'Text' }), noLabel],
      }),
      fakeRegistry,
    ).map((violation) => `${violation.where}: ${violation.reason}`);
    expect(reasons).toEqual([
      'Button / Variant=Icon: 동작의 종류 `button`가 요구하는 `label` 역할 레이어(글자 속성에 묶인 글자)가 없다',
    ]);
  });

  it('상태 이름의 낱말이 낱말 표에 없으면 막는다. 대소문자는 가리지 않는다', () => {
    const reasons = checkComponent(
      component({
        behavior: 'button',
        variants: [
          variant('State=hover', { State: 'hover' }),
          variant('State=Hover dragging', { State: 'Hover dragging' }),
        ],
      }),
      fakeRegistry,
    ).map((violation) => violation.reason);
    expect(reasons).toEqual(['상태 낱말 `dragging`가 동작의 종류 `button`의 낱말 표에 없다']);
  });

  it('State 축이 있는데 종류가 적혀 있지 않으면 낱말을 옮길 표가 없어 막는다', () => {
    const reasons = checkComponent(
      component({ variants: [variant('State=Rest', { State: 'Rest' })] }),
      fakeRegistry,
    ).map((violation) => violation.reason);
    expect(reasons).toEqual([
      'State 축이 있는데 동작의 종류가 적혀 있지 않아 상태 낱말을 옮길 표가 없다',
    ]);
  });

  it('켜진 변형에 꺼진 짝 변형에는 없는 표시 레이어가 없으면 막는다', () => {
    const check = node({ key: 'check', type: 'FRAME' });
    const off = variant('Checked=Off', { Checked: 'Off' }, { ...buttonRoot(), children: [] });
    const on = variant('Checked=On', { Checked: 'On' }, { ...buttonRoot(), children: [check] });
    const same = variant('Checked=On', { Checked: 'On' }, { ...buttonRoot(), children: [] });
    expect(
      checkComponent(component({ behavior: 'checkbox', variants: [off, on] }), fakeRegistry),
    ).toEqual([]);
    expect(
      checkComponent(component({ behavior: 'checkbox', variants: [off, same] }), fakeRegistry).map(
        (violation) => violation.where,
      ),
    ).toEqual(['Button / Checked=On']);
  });

  it('종류가 이름으로 찾는 역할 레이어끼리 이름이 같으면 막는다', () => {
    const off = variant(
      'Checked=Off',
      { Checked: 'Off' },
      {
        ...buttonRoot(),
        children: [
          node({ key: 'close button', type: 'FRAME' }),
          node({ key: 'close button[2]', name: 'close button', type: 'FRAME' }),
        ],
      },
    );
    const reasons = checkComponent(
      component({ behavior: 'checkbox', variants: [off] }),
      fakeRegistry,
    ).map((violation) => violation.reason);
    expect(reasons).toEqual(['입력이나 동작의 역할이 되는 레이어 `close button`가 2개다']);
  });
});

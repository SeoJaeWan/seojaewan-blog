import { describe, expect, it } from 'vitest';

import { buildComponentSchema, layerOf } from './build-schema';
import type { NodeData } from './node-data';
import {
  buttonRoot,
  component,
  iconAsset,
  instance,
  node,
  solid,
  text,
  variant,
} from './node-data.fixture';

// @codocs [[디자인 시스템:스키마]]
describe('스키마: 피그마의 사실을 그대로 적는다', () => {
  const schema = buildComponentSchema(component({ behavior: 'button' }), 'Controls');
  const root = schema.variants[0]?.root;

  it('컴포넌트 이름·노드 ID·페이지·설명·동작의 종류를 적는다', () => {
    expect(schema).toMatchObject({
      formatVersion: 1,
      name: 'Button',
      nodeId: '13:62',
      page: 'Controls',
      description: '기본 버튼',
      behavior: 'button',
    });
  });

  it('숨긴 레이어도 적고 켜고 끄는 속성 키를 함께 적는다', () => {
    expect(root?.children[0]).toMatchObject({
      key: 'icon',
      kind: 'asset',
      isVisible: false,
      propertyRefs: { visible: 'Has icon#13:0', mainComponent: 'Icon#13:1' },
    });
  });

  it('변수에 연결한 값은 변수만, 연결하지 않은 값은 숫자 그대로 적는다(반올림하지 않는다)', () => {
    expect(root?.layout?.padding.left).toEqual({
      variable: { collection: 'Dimension', name: 'spacing/md' },
    });
    expect(root?.width).toEqual({ value: 120 });
    const odd = layerOf(node({ key: 'a', type: 'FRAME', width: { value: 37.333333 } }));
    expect(odd?.width).toEqual({ value: 37.333333 });
  });

  it('칠 스타일에 연결한 칠은 스타일 이름만, 아니면 보이는 칠을 적는다', () => {
    expect(root?.stroke?.paints).toEqual({ style: 'Elevation/Control Border' });
    expect(root?.fills).toEqual({
      paints: [
        {
          type: 'SOLID',
          color: { variable: { collection: 'Color', name: 'White/70' } },
          opacity: 0.7,
        },
      ],
    });
  });

  it('글자는 스타일 이름 하나와 기본 글자만 적는다', () => {
    expect(root?.children[1]).toMatchObject({
      kind: 'text',
      characters: '버튼',
      textStyle: 'Body',
      autoResize: 'WIDTH_AND_HEIGHT',
    });
  });

  it('변형마다 전체를 적는다', () => {
    const two = buildComponentSchema(
      component({
        variants: [variant('A', { V: 'A' }), variant('B', { V: 'B' })],
      }),
      'Controls',
    );
    expect(two.variants.map((item) => item.root.children.length)).toEqual([2, 2]);
  });
});

// @codocs [[디자인 시스템:스키마]]
// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('스키마: 품은 인스턴스는 펼치지 않고 참조로 적는다', () => {
  const inner: NodeData = node({
    key: 'button/label',
    type: 'TEXT',
    isInsideInstance: true,
    text: text(),
    fills: [solid('Black/89')],
  });
  const icon: NodeData = node({
    key: 'button/icon',
    type: 'INSTANCE',
    isInsideInstance: true,
    asset: iconAsset(),
    instance: instance({ component: 'ic_fluent_add_20_regular' }),
  });
  const slotChild = node({ key: 'button/content/item', type: 'FRAME', isInsideInstance: true });
  const slot = node({
    key: 'button/content',
    type: 'SLOT',
    isInsideInstance: true,
    slotProperty: 'Content#5:0',
    isSlotFilled: true,
    children: [slotChild],
  });
  const emptySlot = node({
    key: 'button/footer',
    type: 'SLOT',
    isInsideInstance: true,
    slotProperty: 'Footer#5:1',
    isSlotFilled: false,
  });
  const button = node({
    key: 'button',
    type: 'INSTANCE',
    instance: instance({
      properties: { Variant: 'Accent', Label: '확인', 'Has icon': true },
      overrides: [{ id: 'button/icon', fields: ['boundVariables.fills', 'opacity'] }],
    }),
    children: [inner, icon, slot, emptySlot],
  });
  const layer = layerOf(button);

  it('원본 이름과 속성 값만 적고 안쪽 레이어는 적지 않는다', () => {
    expect(layer).toMatchObject({
      kind: 'instance',
      component: 'Button',
      properties: { Variant: 'Accent', Label: '확인', 'Has icon': true },
    });
    expect(layer).not.toHaveProperty('children');
  });

  it('자산의 색과 자산 인스턴스 전체의 불투명도 덮어쓰기를 원본 안 키로 적는다', () => {
    expect(layer?.kind === 'instance' ? layer.overrides : null).toEqual([
      {
        kind: 'asset-color',
        layer: 'icon',
        color: { variable: { collection: 'Color', name: 'Black/89' } },
      },
      { kind: 'asset-opacity', layer: 'icon', opacity: { value: 1 } },
    ]);
  });

  it('채운 슬롯만 적고 채우지 않은 슬롯은 적지 않는다', () => {
    expect(layer?.kind === 'instance' ? layer.slots : null).toEqual([
      {
        slot: 'Content',
        layer: 'content',
        children: [expect.objectContaining({ key: 'button/content/item', kind: 'box' })],
      },
    ]);
  });

  it('CSS로 그릴 수 없어 막는 노드는 레이어로 적지 않는다', () => {
    const root = { ...buttonRoot(), children: [node({ key: 'v', type: 'VECTOR' })] };
    expect(layerOf(root)).toMatchObject({ kind: 'box', children: [] });
  });
});

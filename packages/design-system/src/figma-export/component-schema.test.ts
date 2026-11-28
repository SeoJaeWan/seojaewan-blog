import { describe, expect, it } from 'vitest';

import type { ComponentLayout } from './component-layout';
import type { ComponentSchema, Layer } from './component-schema';
import {
  buttonLayout,
  buttonSchema,
  messageBoxLayout,
  messageBoxSchema,
} from './figma-export.fixture';
import { childLayerKeys, joinLayerKey, parseLayerKey, ROOT_LAYER_KEY } from './layer-key';

// @codocs [[디자인 시스템:생성 결과 검증]]
describe('레이어 키', () => {
  it('형제 가운데 같은 이름은 두 번째부터 순번을 붙인다', () => {
    expect(childLayerKeys('items', ['item', 'divider', 'item', 'item'])).toEqual([
      'items/item',
      'items/divider',
      'items/item[2]',
      'items/item[3]',
    ]);
  });

  it('이름 안의 /, [, \\는 이스케이프하고 읽을 때 되돌린다', () => {
    const [key] = childLayerKeys(ROOT_LAYER_KEY, ['progress-ring/Arc [a]\\b']);
    expect(key).toBe('progress-ring\\/Arc \\[a]\\\\b');
    expect(parseLayerKey(joinLayerKey(key ?? '', 'x[2]'))).toEqual([
      { name: 'progress-ring/Arc [a]\\b', occurrence: 1 },
      { name: 'x', occurrence: 2 },
    ]);
  });

  it('루트 키는 빈 문자열이고 마디가 없다', () => {
    expect(joinLayerKey(ROOT_LAYER_KEY, 'label')).toBe('label');
    expect(parseLayerKey(ROOT_LAYER_KEY)).toEqual([]);
  });
});

// @codocs [[디자인 시스템:스키마]]
// @codocs [[디자인 시스템:생성 결과 검증]]
describe('스키마와 검증 자료 fixture', () => {
  const pairs: [ComponentSchema, ComponentLayout][] = [
    [buttonSchema, buttonLayout],
    [messageBoxSchema, messageBoxLayout],
  ];

  it.each(pairs)('$name: 검증 자료의 변형은 스키마와 같은 이름·순서다', (schema, layout) => {
    expect(layout.variants.map((variant) => variant.name)).toEqual(
      schema.variants.map((variant) => variant.name),
    );
  });

  it.each(pairs)('$name: 레이어 키가 트리의 자리와 맞다', (schema) => {
    for (const variant of schema.variants) {
      expect(variant.root.key).toBe(ROOT_LAYER_KEY);
      for (const { layer, parentKey, siblings } of walk(variant.root)) {
        const index = siblings.indexOf(layer);
        expect(layer.key).toBe(
          childLayerKeys(
            parentKey,
            siblings.map((sibling) => sibling.name),
          )[index],
        );
      }
    }
  });

  it.each(pairs)(
    '$name: 검증 자료의 레이어는 보이는 스키마 레이어이거나 인스턴스 안쪽이다',
    (schema, layout) => {
      schema.variants.forEach((variant, index) => {
        const layers = [variant.root, ...walk(variant.root).map((entry) => entry.layer)];
        const visible = new Set(
          layers.filter((layer) => layer.isVisible).map((layer) => layer.key),
        );
        const instances = layers
          .filter((layer) => layer.kind === 'instance')
          .map((layer) => layer.key);
        for (const key of Object.keys(layout.variants[index]?.layers ?? {})) {
          const isInsideInstance = instances.some((instance) => key.startsWith(`${instance}/`));
          expect(visible.has(key) || isInsideInstance, key).toBe(true);
        }
      });
    },
  );

  it.each(pairs)('$name: 레이어가 가리키는 속성 키와 전환의 도착 변형이 있다', (schema) => {
    const keys = new Set(schema.properties.map((property) => property.key));
    const names = new Set(schema.variants.map((variant) => variant.name));
    for (const variant of schema.variants) {
      for (const { layer } of walk(variant.root)) {
        for (const key of Object.values(layer.propertyRefs)) {
          expect(keys.has(key), key).toBe(true);
        }
      }
      for (const transition of variant.transitions) {
        expect(names.has(transition.destination)).toBe(true);
      }
    }
  });
});

/**
 * 레이어 트리의 자식을 모두 훑는다(인스턴스는 펼치지 않는다).
 * @param layer 시작 레이어
 * @returns 자식 레이어와 그 부모 키, 형제 목록
 */
function walk(layer: Layer): { layer: Layer; parentKey: string; siblings: Layer[] }[] {
  if (layer.kind !== 'box' && layer.kind !== 'slot') {
    return [];
  }
  return layer.children.flatMap((child) => [
    { layer: child, parentKey: layer.key, siblings: layer.children },
    ...walk(child),
  ]);
}

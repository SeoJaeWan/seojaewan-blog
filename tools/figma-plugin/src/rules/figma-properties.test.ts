// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';
import figmaProperties from './figma-properties.json';
import { propertyHandling } from './property-handling';
import { readTypingsInventory } from './typings-inventory';

const TYPINGS_PACKAGE = '@figma/plugin-typings';
const typingsPath = path.resolve(
  import.meta.dirname,
  '../../node_modules/@figma/plugin-typings/plugin-api.d.ts',
);
// 시각 속성이 아닌 분류
const nonVisualCategories = new Set(['irrelevant', 'nonvisual']);
const properties: Readonly<Record<string, { category: string; type: string } | undefined>> =
  figmaProperties.properties;
const shapes: Readonly<Record<string, string | undefined>> = figmaProperties.shapes;
const visualProperties = Object.entries(figmaProperties.properties)
  .filter(([, entry]) => !nonVisualCategories.has(entry.category))
  .map(([name]) => name);
const inventory = readTypingsInventory(readFileSync(typingsPath, 'utf8'), visualProperties);

// @codocs [[피그마 일치 검사:구조 검사]]
describe('구조 검사의 전수성', () => {
  it('분류표는 지금 설치된 플러그인 타입 정의 버전으로 만들었다', () => {
    expect(figmaProperties.typings).toBe(
      `${TYPINGS_PACKAGE} ${packageJson.devDependencies[TYPINGS_PACKAGE]}`,
    );
  });

  it('타입 정의의 화면 노드 속성은 모두 분류표에 있다(새 속성이 생기면 실패한다)', () => {
    const unclassified = Object.keys(inventory.properties).filter(
      (name) => !(name in figmaProperties.properties),
    );
    expect(unclassified).toEqual([]);
  });

  it('분류표에 적은 속성의 타입은 타입 정의와 같다(값이 늘거나 바뀌면 실패한다)', () => {
    const changed = Object.entries(inventory.properties).filter(
      ([name, type]) => properties[name]?.type !== type,
    );
    expect(changed).toEqual([]);
  });

  it('시각 속성이 가리키는 열거 타입·칠·효과 모양은 타입 정의와 같다', () => {
    expect(inventory.shapes).toEqual(figmaProperties.shapes);
  });

  it('시각 속성으로 분류한 속성은 모두 검사·내보내기 코드가 다룬다', () => {
    expect(Object.keys(propertyHandling).sort()).toEqual([...visualProperties].sort());
  });

  it('열거 값 표의 값은 타입 정의의 값과 같다', () => {
    for (const [name, table] of Object.entries(figmaProperties.values)) {
      const entry = Object.getOwnPropertyDescriptor(figmaProperties.properties, name)?.value as
        { type: string } | undefined;
      if (
        entry === undefined ||
        name === 'type' ||
        name === 'blendMode' ||
        name === 'constraints'
      ) {
        expect(entry, name).toBeDefined();
        continue;
      }
      const literals = [...entry.type.matchAll(/'([A-Z_]+)'/gu)].map((match) => match[1]);
      const named = literals.length > 0 ? literals : enumValues(entry.type);
      expect([name, Object.keys(table).sort()]).toEqual([name, [...named].sort()]);
    }
  });
});

/**
 * 타입 별칭 이름이 가리키는 문자열 값 목록을 모양 표에서 찾는다.
 * @param type 속성 타입 문자열
 * @returns 값 목록
 */
function enumValues(type: string): string[] {
  const names = [...type.matchAll(/\b[A-Z][A-Za-z]+\b/gu)].map((match) => match[0]);
  return names.flatMap((name) => {
    const shape = shapes[name];
    return typeof shape === 'string'
      ? [...shape.matchAll(/'([A-Z_]+)'/gu)].map((match) => match[1] ?? '')
      : [];
  });
}

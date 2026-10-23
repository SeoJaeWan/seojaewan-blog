import { describe, expect, it } from 'vitest';

import { type JsonObject, stableStringify } from './stable-json';
import { componentsUsingTokens, tokenChanges } from './token-changes';

/**
 * 테스트용 토큰을 만든다.
 * @param type 토큰 종류
 * @param value 토큰 값
 * @returns 토큰
 */
function token(type: string, value: string): JsonObject {
  return {
    $type: type,
    $value: value,
    $extensions: { 'com.figma': { collection: 'Semantic', scopes: ['FRAME_FILL'] } },
  };
}

const before: JsonObject = {
  color: { blue: { 'dark-1': token('color', '#005fb8'), base: token('color', '#0078d4') } },
  'accent-fill': { default: token('color', '{color.blue.dark-1}') },
  'text-on-accent': { default: token('color', '{accent-fill.default}') },
  spacing: { '12': token('dimension', '12px') },
  style: {
    text: { Hangul: { Body: { $type: 'typography', $value: { fontSize: '{spacing.12}' } } } },
  },
};

/**
 * 토큰 트리를 바꾼 사본을 만든다.
 * @param change 사본을 바꾸는 함수
 * @returns tokens.json 문자열
 */
function after(change: (tokens: JsonObject) => void): string {
  const copy: JsonObject = structuredClone(before);
  change(copy);
  return stableStringify(copy);
}

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('바뀐 토큰과 영향받는 이름', () => {
  it('같으면 바뀐 것이 없다. 쓰임 범위($extensions)만 바뀐 것도 바뀐 것이 아니다', () => {
    const text = stableStringify(before);
    expect(tokenChanges(text, text).changedPaths).toEqual([]);
    const scopesOnly = after((tokens) => {
      tokens.color = {
        blue: {
          'dark-1': { ...token('color', '#005fb8'), $extensions: {} },
          base: token('color', '#0078d4'),
        },
      };
    });
    expect(tokenChanges(text, scopesOnly).changedPaths).toEqual([]);
  });

  it('값이 바뀐 토큰과 그것을 거쳐서라도 가리키는 별칭을 모두 찾는다', () => {
    const changes = tokenChanges(
      stableStringify(before),
      after((tokens) => {
        tokens.color = {
          blue: { 'dark-1': token('color', '#003e92'), base: token('color', '#0078d4') },
        };
      }),
    );
    expect(changes.changedPaths).toEqual(['color/blue/dark-1']);
    expect([...changes.affectedNames].sort()).toEqual([
      'accent-fill/default',
      'color/blue/dark-1',
      'text-on-accent/default',
    ]);
  });

  it('스타일은 export.json이 부르는 스타일 이름으로 바꾼다', () => {
    const changes = tokenChanges(
      stableStringify(before),
      after((tokens) => {
        tokens.spacing = { '12': token('dimension', '14px') };
      }),
    );
    expect(changes.changedPaths).toEqual(['spacing/12']);
    expect([...changes.affectedNames].sort()).toEqual(['Hangul/Body', 'spacing/12']);
  });

  it('새로 생기거나 사라진 토큰도 바뀐 것이다. main에 tokens.json이 없으면 모두 새 토큰이다', () => {
    const changes = tokenChanges(
      stableStringify(before),
      after((tokens) => {
        tokens.spacing = { '16': token('dimension', '16px') };
      }),
    );
    expect(changes.changedPaths).toEqual(['spacing/12', 'spacing/16']);
    expect(tokenChanges(null, stableStringify(before)).changedPaths).toHaveLength(6);
  });
});

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('바뀐 토큰을 쓰는 컴포넌트', () => {
  const manifests = new Map([
    [
      'button',
      stableStringify({
        variants: {
          'state=rest': {
            layers: [
              { path: '', fill: { variable: 'accent-fill/default' } },
              { path: 'label', text: { segments: [{ textStyle: 'Hangul/Body' }] } },
            ],
          },
        },
      }),
    ],
    [
      'flyout',
      stableStringify({
        variants: { default: { layers: [{ path: '', layout: { gap: 'spacing/16' } }] } },
      }),
    ],
  ]);

  it('export.json 어디에든 그 이름을 쓰면 영향받는다', () => {
    expect(componentsUsingTokens(manifests, new Set(['accent-fill/default']))).toEqual(['button']);
    expect(componentsUsingTokens(manifests, new Set(['Hangul/Body', 'spacing/16']))).toEqual([
      'button',
      'flyout',
    ]);
  });

  it('이름 일부만 같은 것은 쓰는 것이 아니다', () => {
    expect(componentsUsingTokens(manifests, new Set(['spacing/1']))).toEqual([]);
  });

  it('키(변형 이름 등)는 보지 않는다', () => {
    expect(componentsUsingTokens(manifests, new Set(['state=rest']))).toEqual([]);
  });
});

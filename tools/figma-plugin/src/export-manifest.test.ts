import { describe, expect, it } from 'vitest';

import {
  type ComponentEntry,
  componentHash,
  type ExportManifest,
  manifestToJson,
  mergeManifest,
  parseManifest,
  planImageChanges,
  type VariantEntry,
} from './export-manifest';
import { sha256Hex, utf8Encode } from './sha256';
import { stableStringify } from './stable-json';

const IMAGES = 'packages/design-system/figma/images';

/**
 * 테스트용 변형 항목을 만든다.
 * @param hash PNG 해시
 * @returns 변형 항목
 */
function variantEntry(hash: string): VariantEntry {
  return {
    nodeId: `node-${hash}`,
    properties: { State: 'Rest' },
    width: 120,
    height: 32,
    renderBounds: { x: -3, y: -3, width: 126, height: 38 },
    hash,
  };
}

/**
 * 테스트용 컴포넌트 항목을 만든다.
 * @param nodeId 컴포넌트 노드 ID
 * @param variants 변형 이름 → 해시
 * @returns 컴포넌트 항목
 */
function componentEntry(nodeId: string, variants: Record<string, string>): ComponentEntry {
  return {
    name: 'Button',
    nodeId,
    hash: componentHash(Object.values(variants)),
    variants: Object.fromEntries(
      Object.entries(variants).map(([name, hash]) => [name, variantEntry(hash)]),
    ),
  };
}

const base: ExportManifest = {
  fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ',
  exportedAt: '2026-10-01T00:00:00.000Z',
  scale: 1,
  components: {
    button: componentEntry('13:62', { 'state=rest': 'aaa', 'state=hover': 'bbb' }),
    tooltip: componentEntry('14:345', { 'type=default': 'ccc' }),
  },
};

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('컴포넌트마다 내용 해시를 계산해 바뀐 컴포넌트만 다시 내보낸다', () => {
  it('컴포넌트 해시는 변형 해시를 정렬해 이은 문자열의 SHA-256이라 변형 순서와 상관없다', () => {
    expect(componentHash(['bbb', 'aaa'])).toBe(sha256Hex(utf8Encode('aaabbb')));
    expect(componentHash(['aaa', 'bbb'])).toBe(componentHash(['bbb', 'aaa']));
  });

  it('해시가 같은 이미지는 올리지 않고, 바뀌거나 새로 생긴 이미지만 올린다', () => {
    const changes = planImageChanges(base, [
      {
        slug: 'button',
        entry: componentEntry('13:62', {
          'state=rest': 'aaa',
          'state=hover': 'changed',
          'state=pressed': 'new',
        }),
      },
    ]);
    expect(changes.uploads.map((upload) => upload.path)).toEqual([
      `${IMAGES}/button/state=hover.png`,
      `${IMAGES}/button/state=pressed.png`,
    ]);
    expect(changes.deletions).toEqual([]);
    expect(changes.changedComponents).toEqual(['button']);
  });

  it('내보낸 컴포넌트에서 사라진 변형의 이미지는 지운다', () => {
    const changes = planImageChanges(base, [
      { slug: 'button', entry: componentEntry('13:62', { 'state=rest': 'aaa' }) },
    ]);
    expect(changes.uploads).toEqual([]);
    expect(changes.deletions).toEqual([`${IMAGES}/button/state=hover.png`]);
  });

  it('하나도 바뀌지 않은 컴포넌트는 바뀐 목록에 넣지 않는다', () => {
    const changes = planImageChanges(base, [
      { slug: 'tooltip', entry: componentEntry('14:345', { 'type=default': 'ccc' }) },
    ]);
    expect(changes).toEqual({ uploads: [], deletions: [], changedComponents: [] });
  });

  it('기준 export.json이 없으면 모든 이미지를 올린다', () => {
    const changes = planImageChanges(null, [
      { slug: 'tooltip', entry: componentEntry('14:345', { 'type=default': 'ccc' }) },
    ]);
    expect(changes.uploads.map((upload) => upload.path)).toEqual([
      `${IMAGES}/tooltip/type=default.png`,
    ]);
  });

  it('이름이 바뀐 컴포넌트(같은 nodeId)는 이전 폴더의 이미지를 지우고 이전 항목을 없앤다', () => {
    const exported = [
      { slug: 'action-button', entry: componentEntry('13:62', { 'state=rest': 'aaa' }) },
    ];
    const changes = planImageChanges(base, exported);
    expect(changes.uploads.map((upload) => upload.path)).toEqual([
      `${IMAGES}/action-button/state=rest.png`,
    ]);
    expect(changes.deletions).toEqual([
      `${IMAGES}/button/state=rest.png`,
      `${IMAGES}/button/state=hover.png`,
    ]);
    const merged = mergeManifest(base, exported, base);
    expect(Object.keys(merged.components).sort()).toEqual(['action-button', 'tooltip']);
  });
});

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('export.json에 내보낸 기준 자료를 기록한다', () => {
  it('이번에 내보내지 않은 컴포넌트는 이전 항목을 그대로 둔다', () => {
    const exported = [{ slug: 'button', entry: componentEntry('13:62', { 'state=rest': 'x' }) }];
    const merged = mergeManifest(base, exported, {
      fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ',
      exportedAt: '2026-10-21T00:00:00.000Z',
      scale: 1,
    });
    expect(merged.exportedAt).toBe('2026-10-21T00:00:00.000Z');
    expect(merged.components.tooltip).toEqual(base.components.tooltip);
    expect(Object.keys(merged.components.button?.variants ?? {})).toEqual(['state=rest']);
  });

  it('직렬화한 export.json을 다시 읽으면 같은 내용이다', () => {
    const text = stableStringify(manifestToJson(base));
    expect(parseManifest(text)).toEqual(base);
  });

  it('읽을 수 없는 export.json은 없는 것으로 본다', () => {
    expect(parseManifest('not json')).toBeNull();
    expect(parseManifest('[]')).toBeNull();
  });
});

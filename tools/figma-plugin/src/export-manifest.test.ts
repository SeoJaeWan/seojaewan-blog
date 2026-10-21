import { describe, expect, it } from 'vitest';

import {
  componentHash,
  type ComponentManifest,
  type ExportedComponent,
  manifestJson,
  parseComponentManifest,
  planComponentChanges,
  renamedFolders,
  settingsText,
  type VariantEntry,
} from './export-manifest';
import { sha256Hex, utf8Encode } from './sha256';
import { stableStringify } from './stable-json';

/**
 * 테스트용 변형 항목을 만든다.
 * @param hash PNG 해시
 * @param svg 이 변형이 쓰는 vector SVG 파일 이름
 * @returns 변형 항목
 */
function variantEntry(hash: string, svg?: string): VariantEntry {
  return {
    nodeId: `node-${hash}`,
    properties: { State: 'Rest' },
    width: 120,
    height: 32,
    renderBounds: { x: -3, y: -3, width: 126, height: 38 },
    hash,
    layers: [
      { path: '', kind: 'frame', type: 'COMPONENT', x: 0, y: 0, width: 120, height: 32 },
      ...(svg === undefined
        ? []
        : [{ path: 'icon', kind: 'vector', type: 'INSTANCE', svg: { file: svg } }]),
    ],
  };
}

/**
 * 테스트용 컴포넌트 export.json을 만든다.
 * @param variants 변형 이름 → [PNG 해시, SVG 파일]
 * @param exportedAt 내보낸 시각
 * @returns 컴포넌트 export.json
 */
function manifest(
  variants: Record<string, [string, string?]>,
  exportedAt = '2026-10-01T00:00:00.000Z',
): ComponentManifest {
  const entries = Object.fromEntries(
    Object.entries(variants).map(([name, [hash, svg]]) => [name, variantEntry(hash, svg)]),
  );
  return {
    name: 'Button',
    nodeId: '13:62',
    hash: componentHash(Object.values(entries)),
    exportedAt,
    variants: entries,
  };
}

/**
 * 테스트용 내보낸 컴포넌트를 만든다.
 * @param next 새 export.json
 * @returns 내보낸 컴포넌트
 */
function exportedOf(next: ComponentManifest): ExportedComponent {
  const svgFiles = Object.values(next.variants).flatMap((variant) =>
    variant.layers.flatMap((layer) => {
      const { svg } = layer;
      return svg !== null &&
        typeof svg === 'object' &&
        !Array.isArray(svg) &&
        typeof svg.file === 'string'
        ? [svg.file]
        : [];
    }),
  );
  return { slug: 'button', manifest: next, svgFiles };
}

const base = manifest({ 'state=rest': ['aaa', 'a.svg'], 'state=hover': ['bbb', 'b.svg'] });
const baseFiles = ['export.json', 'state=rest.png', 'state=hover.png', 'a.svg', 'b.svg'];

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('컴포넌트마다 내용 해시를 계산해 바뀐 컴포넌트만 다시 내보낸다', () => {
  it('컴포넌트 해시는 변형마다 PNG 해시와 레이어 정보를 이어 정렬한 SHA-256이라 변형 순서와 상관없다', () => {
    const a = { hash: 'aaa', layers: [] };
    const b = { hash: 'bbb', layers: [] };
    expect(componentHash([b, a])).toBe(sha256Hex(utf8Encode('aaa[]\nbbb[]\n')));
    expect(componentHash([a, b])).toBe(componentHash([b, a]));
  });

  it('하나도 바뀌지 않은 컴포넌트는 파일을 건드리지 않고, 내보낸 시각만 다른 export.json도 다시 쓰지 않는다', () => {
    const same = manifest(
      { 'state=rest': ['aaa', 'a.svg'], 'state=hover': ['bbb', 'b.svg'] },
      '2026-10-21T00:00:00.000Z',
    );
    expect(planComponentChanges(exportedOf(same), base, baseFiles)).toEqual({
      slug: 'button',
      pngUploads: [],
      svgUploads: [],
      deletions: [],
      manifestText: null,
    });
  });

  it('해시가 바뀌거나 새로 생긴 이미지만 올리고, 사라진 변형의 이미지와 쓰지 않는 SVG는 지운다', () => {
    const next = manifest({ 'state=rest': ['aaa', 'a.svg'], 'state=pressed': ['ccc', 'c.svg'] });
    const changes = planComponentChanges(exportedOf(next), base, baseFiles);
    expect(changes.pngUploads).toEqual(['state=pressed']);
    expect(changes.svgUploads).toEqual(['c.svg']);
    expect(changes.deletions).toEqual(['b.svg', 'state=hover.png']);
    expect(changes.manifestText).toBe(stableStringify(manifestJson(next)));
  });

  it('이미지가 같아도 레이어 정보가 바뀌면 export.json을 다시 쓴다', () => {
    const next = manifest({ 'state=rest': ['aaa', 'a.svg'], 'state=hover': ['bbb', 'b.svg'] });
    const hover = next.variants['state=hover'];
    if (hover === undefined) {
      throw new Error('fixture');
    }
    next.variants['state=hover'] = { ...hover, layers: [{ path: '', x: 1 }] };
    const changes = planComponentChanges(exportedOf(next), base, baseFiles);
    expect(changes.pngUploads).toEqual([]);
    expect(changes.manifestText).not.toBeNull();
  });

  it('저장소에 없는 컴포넌트는 모든 파일을 올린다', () => {
    const changes = planComponentChanges(exportedOf(base), null, []);
    expect(changes.pngUploads.sort()).toEqual(['state=hover', 'state=rest']);
    expect(changes.svgUploads).toEqual(['a.svg', 'b.svg']);
    expect(changes.manifestText).not.toBeNull();
  });

  it('이름이 바뀐 컴포넌트(같은 nodeId)의 이전 폴더만 지우고, 함께 내보낸 폴더는 지우지 않는다', () => {
    const others = new Map([
      ['action-button', '13:62'],
      ['tooltip', '14:345'],
    ]);
    expect(renamedFolders([exportedOf(base)], others)).toEqual(['action-button']);
    expect(
      renamedFolders([exportedOf(base), { ...exportedOf(base), slug: 'action-button' }], others),
    ).toEqual([]);
  });
});

// @codocs [[피그마 일치 검사:export.json 계약]]
describe('export.json 계약', () => {
  it('직렬화한 컴포넌트 export.json을 다시 읽으면 같은 내용이다', () => {
    expect(parseComponentManifest(stableStringify(manifestJson(base)))).toEqual(base);
  });

  it('읽을 수 없는 export.json은 없는 것으로 본다', () => {
    expect(parseComponentManifest('not json')).toBeNull();
    expect(parseComponentManifest('[]')).toBeNull();
  });

  it('figma.json에는 파일 키와 배율만 두고 시각을 두지 않는다', () => {
    expect(JSON.parse(settingsText({ fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ', scale: 1 }))).toEqual({
      fileKey: 'XV9Y1UT5UH4tC5hSqLVipZ',
      scale: 1,
    });
  });
});

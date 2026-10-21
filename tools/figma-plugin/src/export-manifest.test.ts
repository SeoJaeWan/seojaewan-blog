import { describe, expect, it } from 'vitest';

import {
  componentHash,
  type ComponentManifest,
  type ExportedComponent,
  manifestText,
  planComponentChanges,
  readManifestHashes,
  renamedFolders,
  settingsText,
  type VariantEntry,
} from './export-manifest';

/**
 * 테스트용 변형 항목을 만든다.
 * @param hash PNG 해시
 * @param fill 루트 칠 변수 이름
 * @returns 변형 항목
 */
function variantEntry(hash: string, fill = 'accent-fill/default'): VariantEntry {
  return {
    nodeId: `node-${hash}`,
    properties: { State: 'Rest' },
    hash,
    layers: [{ path: '', type: 'COMPONENT', fill: { variable: fill } }],
    hidden: ['icon'],
    cases: { 'showIcon=true': { layers: [{ path: '' }, { path: 'icon' }], hidden: [] } },
  };
}

/**
 * 테스트용 컴포넌트 export.json을 만든다.
 * @param variants 변형 이름 → PNG 해시
 * @returns 컴포넌트 export.json
 */
function manifest(variants: Record<string, string>): ComponentManifest {
  const entries = Object.fromEntries(
    Object.entries(variants).map(([name, hash]) => [name, variantEntry(hash)]),
  );
  return {
    name: 'Button',
    nodeId: '13:62',
    hash: componentHash(Object.values(entries)),
    booleans: { showIcon: { key: 'Show icon#13:0', defaultValue: false } },
    variants: entries,
  };
}

/**
 * 테스트용 내보낸 컴포넌트를 만든다.
 * @param next 컴포넌트 export.json
 * @returns 내보낸 컴포넌트
 */
function exported(next: ComponentManifest): ExportedComponent {
  return { slug: 'button', manifest: next };
}

const base = manifest({ 'state=rest': 'aaa', 'state=hover': 'bbb' });
const baseText = manifestText(base);
const baseHashes = readManifestHashes(baseText)?.hashes ?? new Map<string, string>();
const baseFiles = ['export.json', 'state=rest.png', 'state=hover.png'];

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('컴포넌트마다 내용 해시를 계산해 바뀐 컴포넌트만 다시 내보낸다', () => {
  it('컴포넌트 해시는 변형 순서와 상관없다', () => {
    const a = variantEntry('aaa');
    const b = variantEntry('bbb');
    expect(componentHash([a, b])).toBe(componentHash([b, a]));
  });

  it('레이어 이름 정보가 바뀌면 이미지가 같아도 해시가 바뀐다', () => {
    expect(componentHash([variantEntry('aaa')])).not.toBe(
      componentHash([variantEntry('aaa', 'accent-fill/secondary')]),
    );
  });

  it('하나도 바뀌지 않은 컴포넌트는 파일을 건드리지 않는다', () => {
    const changes = planComponentChanges(exported(base), baseText, baseHashes, baseFiles);
    expect(changes).toEqual({
      slug: 'button',
      pngUploads: [],
      deletions: [],
      manifestText: null,
    });
  });

  it('해시가 바뀌거나 새로 생긴 이미지만 올리고, 사라진 변형의 이미지는 지운다', () => {
    const next = manifest({ 'state=rest': 'aaa', 'state=pressed': 'ccc' });
    const changes = planComponentChanges(exported(next), baseText, baseHashes, baseFiles);
    expect(changes.pngUploads).toEqual(['state=pressed']);
    expect(changes.deletions).toEqual(['state=hover.png']);
    expect(changes.manifestText).not.toBeNull();
  });

  it('저장소에 없는 컴포넌트는 모든 파일을 올린다', () => {
    const changes = planComponentChanges(exported(base), null, new Map(), []);
    expect(changes.pngUploads).toEqual(['state=rest', 'state=hover']);
    expect(changes.manifestText).toBe(baseText);
  });

  it('이름이 바뀐 컴포넌트(같은 nodeId)의 이전 폴더만 지우고, 함께 내보낸 폴더는 지우지 않는다', () => {
    expect(
      renamedFolders(
        [exported(base)],
        new Map([
          ['old-button', '13:62'],
          ['menu', '1:1'],
        ]),
      ),
    ).toEqual(['old-button']);
  });
});

// @codocs [[피그마 일치 검사:export.json 계약]]
describe('export.json 계약', () => {
  it('export.json에는 내보낸 시각을 두지 않아, 같은 피그마를 다시 내보내면 내용이 같다', () => {
    expect(baseText).not.toContain('exportedAt');
    expect(manifestText(manifest({ 'state=rest': 'aaa', 'state=hover': 'bbb' }))).toBe(baseText);
  });

  it('변형마다 레이어 목록, 숨긴 레이어, BOOLEAN 속성 경우를 담는다', () => {
    const parsed: unknown = JSON.parse(baseText);
    expect(parsed).toMatchObject({
      booleans: { showIcon: { key: 'Show icon#13:0', defaultValue: false } },
      variants: {
        'state=rest': {
          hidden: ['icon'],
          cases: { 'showIcon=true': { hidden: [] } },
        },
      },
    });
  });

  it('읽을 수 없는 export.json은 없는 것으로 본다', () => {
    expect(readManifestHashes('{')).toBeNull();
  });

  it('figma.json에는 파일 키와 배율만 둔다', () => {
    expect(JSON.parse(settingsText({ fileKey: 'abc', scale: 1 }))).toEqual({
      fileKey: 'abc',
      scale: 1,
    });
  });
});

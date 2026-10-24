import { describe, expect, it } from 'vitest';

import {
  type ExportManifest,
  manifestFiles,
  manifestText,
  nodeBox,
  readManifestNodeId,
  renamedFolders,
  settingsText,
} from './export-manifest';

const manifest: ExportManifest = {
  name: 'Button',
  nodeId: '13:62',
  variants: {
    'style=accent,state=rest': {
      nodeId: '13:1',
      properties: { Style: 'Accent', State: 'Rest' },
      node: { x: 8, y: 4, width: 120, height: 32 },
    },
    'style=accent,state=hover': {
      nodeId: '13:2',
      properties: { Style: 'Accent', State: 'Hover' },
      node: { x: 8, y: 4, width: 120, height: 32 },
    },
  },
};

// @codocs [[피그마 연동:스토리 규칙]]
describe('export.json은 변형을 스토리와 짝짓는 데 필요한 것만 담는다', () => {
  it('이름, nodeId, 변형 파일 이름마다 변형 nodeId, 속성, PNG 안 노드 위치만 둔다', () => {
    expect(JSON.parse(manifestText(manifest))).toEqual({
      name: 'Button',
      nodeId: '13:62',
      variants: {
        'style=accent,state=hover': {
          nodeId: '13:2',
          properties: { State: 'Hover', Style: 'Accent' },
          node: { height: 32, width: 120, x: 8, y: 4 },
        },
        'style=accent,state=rest': {
          nodeId: '13:1',
          properties: { State: 'Rest', Style: 'Accent' },
          node: { height: 32, width: 120, x: 8, y: 4 },
        },
      },
    });
  });

  it('내보낸 시각을 두지 않아, 같은 피그마를 다시 내보내면 내용이 같다', () => {
    expect(manifestText(manifest)).not.toContain('exportedAt');
    expect(manifestText(structuredClone(manifest))).toBe(manifestText(manifest));
  });

  it('figma.json에는 파일 키와 배율만 둔다', () => {
    expect(JSON.parse(settingsText({ fileKey: 'abc', scale: 1 }))).toEqual({
      fileKey: 'abc',
      scale: 1,
    });
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('PNG 안 노드 위치', () => {
  it('노드 상자와 그려지는 범위(그림자, 노드 밖 자식)의 차이로 구한다', () => {
    // Tooltip Type=Balloon: 위로 나온 꼬리와 그림자 때문에 PNG가 316×66이다.
    expect(
      nodeBox(
        { x: 251, y: 4560, width: 300, height: 42 },
        { x: 243, y: 4548, width: 316, height: 66 },
      ),
    ).toEqual({ x: 8, y: 12, width: 300, height: 42 });
  });

  it('그려지는 범위가 없으면 노드 상자를 그대로 쓰고, 소수 오차는 0.01px로 반올림한다', () => {
    expect(nodeBox({ x: 10.004, y: 0, width: 50.333333, height: 30 }, null)).toEqual({
      x: 0,
      y: 0,
      width: 50.33,
      height: 30,
    });
    expect(
      nodeBox({ x: 10.1, y: 5, width: 4, height: 4 }, { x: 10, y: 5, width: 4, height: 4 }).x,
    ).toBe(0.1);
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('다시 내보내면 그 대상 폴더만 새로 쓴다', () => {
  it('폴더에는 export.json과 변형 PNG만 있어야 한다', () => {
    expect(manifestFiles(manifest)).toEqual([
      'export.json',
      'style=accent,state=rest.png',
      'style=accent,state=hover.png',
    ]);
  });

  it('nodeId가 같고 폴더가 다른 폴더는 이름이 바뀐 대상의 이전 폴더다', () => {
    const renamed = renamedFolders(
      [{ folder: 'components/button', nodeId: '13:62' }],
      new Map([
        ['components/old-button', '13:62'],
        ['components/menu', '1:1'],
      ]),
    );
    expect([...renamed]).toEqual([['components/old-button', 'components/button']]);
  });

  it('함께 내보낸 폴더는 이전 폴더로 보지 않는다', () => {
    expect(
      renamedFolders(
        [
          { folder: 'components/button', nodeId: '13:62' },
          { folder: 'components/old-button', nodeId: '9:9' },
        ],
        new Map([['components/old-button', '13:62']]),
      ).size,
    ).toBe(0);
  });

  it('읽을 수 없는 export.json은 nodeId가 없는 것으로 본다', () => {
    expect(readManifestNodeId('{')).toBeNull();
    expect(readManifestNodeId(manifestText(manifest))).toBe('13:62');
  });
});

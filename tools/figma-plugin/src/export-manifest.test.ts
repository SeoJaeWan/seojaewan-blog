import { describe, expect, it } from 'vitest';

import {
  type ExportManifest,
  manifestFiles,
  manifestText,
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
    },
    'style=accent,state=hover': {
      nodeId: '13:2',
      properties: { Style: 'Accent', State: 'Hover' },
    },
  },
};

// @codocs [[피그마 연동:스토리 규칙]]
describe('export.json은 변형을 스토리와 짝짓는 데 필요한 것만 담는다', () => {
  it('이름, nodeId, 변형 파일 이름마다 변형 nodeId와 속성만 둔다', () => {
    expect(JSON.parse(manifestText(manifest))).toEqual({
      name: 'Button',
      nodeId: '13:62',
      variants: {
        'style=accent,state=hover': {
          nodeId: '13:2',
          properties: { State: 'Hover', Style: 'Accent' },
        },
        'style=accent,state=rest': {
          nodeId: '13:1',
          properties: { State: 'Rest', Style: 'Accent' },
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

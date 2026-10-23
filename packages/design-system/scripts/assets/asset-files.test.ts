// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { sourceAssetsDir } from '../package-paths.ts';
import { expectedAssetFiles } from './asset-files.ts';
import { assetDataModule, parseSvgAsset } from './assets-code.ts';

const SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 1L15 15H1Z" fill="currentColor" fill-rule="evenodd"/>
</svg>`;

// @codocs [[피그마 연동:자산]]
describe('자산 생성', () => {
  it('SVG의 viewBox와 요소를 React 속성 이름으로 옮긴다', () => {
    const data = parseSvgAsset(SVG, 'icons/test.svg');
    expect(data.viewBox).toBe('0 0 16 16');
    expect(data.elements).toEqual([
      {
        tag: 'path',
        attributes: { d: 'M8 1L15 15H1Z', fill: 'currentColor', fillRule: 'evenodd' },
      },
    ]);
    expect(assetDataModule(new Map([['icons/test.svg', data]]))).toContain("'icons/test.svg': {");
  });

  it('옮길 수 없는 SVG 요소는 실패한다', () => {
    expect(() =>
      parseSvgAsset('<svg viewBox="0 0 1 1"><g><path d="M0 0"/></g></svg>', 'icons/group.svg'),
    ).toThrow();
  });

  it('src/assets가 figma/assets와 맞다', () => {
    // 다르면 `pnpm --filter @seojaewan/design-system generate:assets`로 다시 만들어 커밋한다.
    for (const [file, bytes] of expectedAssetFiles()) {
      const name = path.relative(sourceAssetsDir, file);
      expect(existsSync(file), name).toBe(true);
      expect(readFileSync(file).equals(bytes), name).toBe(true);
    }
  });
});

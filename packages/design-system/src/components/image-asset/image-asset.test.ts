import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getImageAsset, type ImageAssetName } from './image-asset';

// @codocs [[피그마 연동:자산]]
describe('ImageAsset', () => {
  it('generate:assets가 만든 래스터 자산(WebP)을 모두 확장자 없는 이름으로 쓸 수 있다', () => {
    const files = readdirSync(path.resolve(import.meta.dirname, '../../assets/images')).sort();
    expect(files.every((file) => file.endsWith('.webp'))).toBe(true);
    const names = files.map((file) => `images/${file.slice(0, -'.webp'.length)}`);
    const known: readonly ImageAssetName[] = [
      'images/app-chrome',
      'images/app-file-explorer',
      'images/avatar-profile-placeholder',
      'images/avatar-profile',
      'images/chart-bar-ranking',
      'images/equation-quadratic-formula',
      'images/file-document',
      'images/file-folder',
      'images/file-recycle-bin-empty',
      'images/file-recycle-bin-full',
      'images/wallpaper-bloom',
    ];
    expect(names).toEqual(known);
  });

  it('getImageAsset은 생성된 WebP의 원본 너비·높이를 파일 주소와 함께 돌려준다', () => {
    const asset = getImageAsset('images/wallpaper-bloom');
    expect(asset.src).toContain('wallpaper-bloom.webp');
    expect(asset.width).toBeGreaterThan(0);
    expect(asset.height).toBeGreaterThan(0);
  });
});

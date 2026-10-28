import { readdirSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageAsset, type ImageAssetName } from './image-asset';

// @codocs [[피그마 연동:자산]]
describe('ImageAsset', () => {
  it('자산 이름의 파일 주소를 장식 이미지로 그린다', () => {
    render(<ImageAsset name="images/file-folder" className="size-16" />);
    const image = screen.getByRole('presentation');
    expect(image.getAttribute('src')).toContain('file-folder.webp');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveClass('size-16');
  });

  it('generate:assets가 만든 래스터 자산(WebP)을 모두 확장자 없는 이름으로 쓸 수 있다', () => {
    const files = readdirSync(path.resolve(import.meta.dirname, '../../assets/images')).sort();
    expect(files.every((file) => file.endsWith('.webp'))).toBe(true);
    const names = files.map((file) => `images/${file.slice(0, -'.webp'.length)}`);
    const known: readonly ImageAssetName[] = [
      'images/app-chrome',
      'images/app-file-explorer',
      'images/avatar-profile-placeholder',
      'images/avatar-profile',
      'images/equation-quadratic-formula',
      'images/file-document',
      'images/file-folder',
      'images/file-recycle-bin-empty',
      'images/file-recycle-bin-full',
      'images/wallpaper-bloom',
    ];
    expect(names).toEqual(known);
  });
});

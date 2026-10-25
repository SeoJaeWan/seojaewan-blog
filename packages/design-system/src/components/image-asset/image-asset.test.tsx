import { readdirSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageAsset, type ImageAssetName } from './image-asset';

// @codocs [[피그마 연동:자산]]
describe('ImageAsset', () => {
  it('자산 이름의 파일 주소를 장식 이미지로 그린다', () => {
    render(<ImageAsset name="images/file-folder.png" className="size-16" />);
    const image = screen.getByRole('presentation');
    expect(image.getAttribute('src')).toContain('file-folder.png');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveClass('size-16');
  });

  it('generate:assets가 만든 래스터 자산을 모두 이름으로 쓸 수 있다', () => {
    const files = readdirSync(path.resolve(import.meta.dirname, '../../assets/images')).sort();
    const names = files.map((file) => `images/${file}`);
    const known: readonly ImageAssetName[] = [
      'images/app-chrome.png',
      'images/app-file-explorer.png',
      'images/avatar-profile-placeholder.png',
      'images/avatar-profile.png',
      'images/file-document.png',
      'images/file-folder.png',
      'images/file-recycle-bin-full.png',
    ];
    expect(names).toEqual(known);
  });
});

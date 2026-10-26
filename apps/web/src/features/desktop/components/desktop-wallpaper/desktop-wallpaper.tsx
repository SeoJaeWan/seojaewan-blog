import type { JSX } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

/**
 * 바탕화면 배경화면(Bloom)을 그린다. 가장 가까운 위치 기준 요소(`relative`)를 꽉 채워 맨 아래에 깔리고,
 * 뒤에 오는 형제 요소가 그 위에 그려진다. 어디까지 덮을지는 쓰는 곳(화면 배치)이 정한다.
 * @codocs [[바탕화면:배경화면]]
 * @returns 배경화면
 */
export function DesktopWallpaper(): JSX.Element {
  return (
    <ImageAsset
      name="images/wallpaper-bloom.png"
      className="absolute inset-0 size-full object-cover"
    />
  );
}

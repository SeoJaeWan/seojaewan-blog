import type { JSX } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

/**
 * 바탕화면 배경화면(Bloom)을 그린다. 가장 가까운 위치 기준 요소(`relative`)를 꽉 채워 맨 아래에 깔리고,
 * 뒤에 오는 형제 요소가 그 위에 그려진다. 어디까지 덮을지는 쓰는 곳(화면 배치)이 정한다.
 * 아이콘(`DesktopIcons`)과 따로 둔 것은 배경화면이 작업 표시줄 뒤까지 깔려, 한 덩어리로 묶으면 DOM 구조가 바뀌기 때문이다(`DesktopScene`).
 * @codocs [[바탕화면:배경화면]]
 * @returns 배경화면
 */
export function DesktopWallpaper(): JSX.Element {
  return (
    <ImageAsset name="images/wallpaper-bloom" className="absolute inset-0 size-full object-cover" />
  );
}

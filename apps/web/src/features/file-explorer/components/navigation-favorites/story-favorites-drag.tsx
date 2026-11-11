import type { JSX } from 'react';

import { FileItem, ImageAsset, NavigationPane, Tooltip } from '@seojaewan/design-system';

import { getExplorerWindowParts } from '@/features/file-explorer/components/explorer-window/story-explorer-window-parts';

import { NavigationFavorites } from './navigation-favorites';
import { FAVORITES_DRAG } from './story-data';

type StoryFavoritesDragProps = {
  drop: keyof typeof FAVORITES_DRAG;
};

/**
 * 탐색 창 즐겨찾기로 항목을 끄는 순간(피그마 Explorer/FavoritesDrag)을 그리는 스토리 도우미다.
 * 탐색 창은 실제 즐겨찾기 조립(NavigationFavorites)과 탐색기 창 스토리와 같은 Blog 폴더 트리로 그리고, 피그마처럼 프레임 아래에 붙인다.
 * 끄는 복제본과 툴팁은 실제로는 포인터를 따라 화면 기준으로 그리므로(ItemDragGhost), 여기서는 같은 부품(잘라낸 모양의 FileItem, Tooltip)을
 * 피그마 자리에 둔다. 놓을 수 없을 때의 `not-allowed` 커서는 그림에 나오지 않는다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param props 컴포넌트 속성
 * @param props.drop 피그마 Drop. allowed는 폴더를 놓을 자리에 가로선, not-allowed는 글이라 가로선이 없다
 * @returns 즐겨찾기로 끄는 모습
 */
export function StoryFavoritesDrag({ drop }: StoryFavoritesDragProps): JSX.Element {
  const drag = FAVORITES_DRAG[drop];
  const parts = getExplorerWindowParts({ device: 'desktop', folder: 'blog', selection: 'none' });
  return (
    <div className="relative flex size-full flex-col justify-end">
      <NavigationPane role="tree" aria-label="탐색 창" className="w-fit">
        <NavigationFavorites areaId="story" items={parts.favorites} dropSlot={drag.dropSlot} />
        {parts.navigation}
      </NavigationPane>
      <FileItem
        surface="explorer"
        size="large"
        name={drag.name}
        icon={
          <ImageAsset
            name={drag.kind === 'folder' ? 'images/file-folder' : 'images/file-document'}
          />
        }
        isCut
        aria-hidden="true"
        className="absolute"
        style={{ left: drag.ghost.x, top: drag.ghost.y }}
      />
      <Tooltip
        text="즐겨찾기에 고정"
        className="absolute"
        style={{ left: drag.tooltip.x, top: drag.tooltip.y }}
      />
    </div>
  );
}

import type { JSX } from 'react';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-body/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-body/components/explorer-content/explorer-content';
import { ExplorerWindow } from '@/features/file-explorer/components/explorer-window/explorer-window';
import { getExplorerWindowParts } from '@/features/file-explorer/components/explorer-window/story-explorer-window-parts';
import { NavigationFavorites } from '@/features/file-explorer/components/navigation-favorites/navigation-favorites';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';

import { PREVIEW_MOBILE_LIST_WIDTH, PREVIEW_THUMBNAIL, PREVIEW_WINDOWS } from './story-data';
import { TaskbarWindowPreviewList } from './taskbar-window-preview-list';

type PreviewListStoryProps = {
  count: number;
  device?: 'desktop' | 'mobile';
};

/**
 * 피그마 조립 `Taskbar/PreviewList`를 같은 데이터로 그리는 스토리 도우미다. 창 미리보기 목록 스토리와
 * 그 목록을 품는 `Taskbar/AppPreview` 스토리가 함께 쓴다.
 * 데스크톱 축소 화면은 실제 탐색기 창을 `WindowThumbnail`로 줄인 것이다. 축소 화면의 탐색기 창은 피그마처럼
 * `Window/Explorer`(`Device=Desktop, Folder=Blog, Selection=Single`) 그대로이고(탐색 창 맨 위 즐겨찾기 칸 포함), 탭 제목만 창마다 다르다.
 * 모바일은 축소 화면 없는 제목 줄이고, 목록 너비는 피그마 모바일 화면 폭에서 좌우 12px을 뺀 폭이다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @param props 컴포넌트 속성
 * @param props.count 보일 창 개수(피그마 Taskbar/PreviewList Count)
 * @param props.device 기기(피그마 Taskbar/PreviewList Device)
 * @returns TaskbarWindowPreviewList
 */
export function PreviewListStory({
  count,
  device = 'desktop',
}: PreviewListStoryProps): JSX.Element {
  const windows = PREVIEW_WINDOWS.slice(0, count);
  if (device === 'mobile') {
    return (
      <TaskbarWindowPreviewList
        app="file-explorer"
        device="mobile"
        listWidth={PREVIEW_MOBILE_LIST_WIDTH}
        windows={windows.map((item) => ({ id: item.id, title: item.title }))}
      />
    );
  }
  const parts = getExplorerWindowParts({ device: 'desktop', folder: 'blog', selection: 'single' });
  return (
    <TaskbarWindowPreviewList
      app="file-explorer"
      windows={windows.map(
        /**
         * 창 하나의 미리보기 데이터를 만든다.
         * @param item 창 제목, 탭 제목과 id
         * @returns 미리보기 데이터
         */
        (item) => ({
          id: item.id,
          title: item.title,
          aspectRatio: PREVIEW_THUMBNAIL.aspectRatio,
          thumbnail: (
            <WindowThumbnail
              width={PREVIEW_THUMBNAIL.width}
              height={PREVIEW_THUMBNAIL.height}
              scale={PREVIEW_THUMBNAIL.scale}
            >
              <ExplorerWindow
                device="desktop"
                tabs={[{ title: item.tabTitle, icon: parts.tabIcon, isSelected: true }]}
              >
                <ExplorerContent
                  device="desktop"
                  locationIcon={parts.locationIcon}
                  searchPlaceholder={parts.searchPlaceholder}
                  path={parts.path}
                  commands={<ExplorerCommands device="desktop" location={parts.commandsLocation} />}
                  navigation={
                    <>
                      <NavigationFavorites
                        areaId={`preview-${item.id}`}
                        items={parts.favorites}
                        dropSlot={null}
                      />
                      {parts.navigation}
                    </>
                  }
                  itemCount={parts.itemCount}
                  selection={parts.selection}
                  hasSelection={parts.hasSelection}
                >
                  {parts.items}
                </ExplorerContent>
              </ExplorerWindow>
            </WindowThumbnail>
          ),
        }),
      )}
    />
  );
}

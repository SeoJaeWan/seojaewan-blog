import type { JSX } from 'react';

import { ExplorerContent, ExplorerWindow } from '@/features/file-explorer/file-explorer';
import { TaskbarWindowPreviewList } from '@/features/taskbar/taskbar';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';
import { getExplorerWindowParts } from '@/shared/stories/explorer-window-parts/explorer-window-parts';
import {
  PREVIEW_THUMBNAIL,
  PREVIEW_WINDOWS,
} from '@/shell/stories/preview-list-data/preview-list-data';

type PreviewListStoryProps = {
  /** 보일 창 개수(피그마 Taskbar/PreviewList Count) */
  count: number;
};

/**
 * 피그마 조립 `Taskbar/PreviewList`를 같은 데이터로 그리는 스토리 도우미다. 창 미리보기 목록 스토리와
 * 그 목록을 품는 `Taskbar/AppPreview` 스토리가 함께 쓴다. 축소 화면은 실제 탐색기 창을 `WindowThumbnail`로 줄인 것이다.
 * 피그마처럼 축소 화면의 탐색기 창(`Device=Desktop, Folder=Blog, Selection=Single`)은 명령 모음 자리(Commands)가 비어 있다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @param props
 * @returns TaskbarWindowPreviewList
 */
export function PreviewListStory(props: PreviewListStoryProps): JSX.Element {
  const { count } = props;
  const parts = getExplorerWindowParts({ device: 'desktop', folder: 'blog', selection: 'single' });
  return (
    <TaskbarWindowPreviewList
      app="file-explorer"
      windows={PREVIEW_WINDOWS.slice(0, count).map(
        /**
         * 창 하나의 미리보기 데이터를 만든다.
         * @param item 창 제목과 id
         * @returns 미리보기 데이터
         */
        (item) => ({
          id: item.id,
          title: item.title,
          thumbnail: (
            <WindowThumbnail
              width={PREVIEW_THUMBNAIL.width}
              height={PREVIEW_THUMBNAIL.height}
              scale={PREVIEW_THUMBNAIL.scale}
            >
              <ExplorerWindow
                device="desktop"
                tabs={[{ title: parts.tabTitle, selected: true }]}
                className="size-full"
              >
                <ExplorerContent
                  device="desktop"
                  className="min-h-0 w-full flex-1"
                  locationIcon={parts.locationIcon}
                  searchPlaceholder={parts.searchPlaceholder}
                  path={parts.path}
                  navigation={parts.navigation}
                  itemCount={parts.itemCount}
                  selection={parts.selection}
                  showSelection={parts.showSelection}
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

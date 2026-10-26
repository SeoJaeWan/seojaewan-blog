import type { JSX } from 'react';

import { WindowThumbnail } from '@/core/window/window';
import { TaskbarWindowPreviewList } from '@/features/taskbar/components/taskbar-window-preview-list/taskbar-window-preview-list';
import {
  PREVIEW_THUMBNAIL,
  PREVIEW_WINDOWS,
} from '@/features/taskbar/stories/preview-list-data/preview-list-data';
import { ExplorerWindowStory } from '@/shared/stories/explorer-window-story/explorer-window-story';

type PreviewListStoryProps = {
  /** 보일 창 개수(피그마 Taskbar/PreviewList Count) */
  count: number;
};

/**
 * 피그마 조립 `Taskbar/PreviewList`를 같은 데이터로 그리는 스토리 도우미다. 창 미리보기 목록 스토리와
 * 그 목록을 품는 `Taskbar/AppPreview` 스토리가 함께 쓴다. 축소 화면은 실제 탐색기 창을 `WindowThumbnail`로 줄인 것이다.
 * @param props
 * @returns TaskbarWindowPreviewList
 */
export function PreviewListStory(props: PreviewListStoryProps): JSX.Element {
  const { count } = props;
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
              <ExplorerWindowStory
                device="desktop"
                folder="blog"
                selection="single"
                showCommands={false}
                className="size-full"
              />
            </WindowThumbnail>
          ),
        }),
      )}
    />
  );
}

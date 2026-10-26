import type { ReactNode } from 'react';

import { BreadcrumbItem, ImageAsset } from '@seojaewan/design-system';

import { ChromePage, ChromeWindow } from '@/features/chrome/chrome';
import {
  ExplorerCommands,
  ExplorerContent,
  ExplorerWindow,
} from '@/features/file-explorer/file-explorer';
import type { OpenWindow, WindowFrameControls } from '@/features/window/window';
import type { Device } from '@/shared/viewport/use-device';

// 글 데이터를 붙이기 전, 앱을 처음 열 때의 창 내용이다. 탐색기는 빈 `Blog` 폴더, Chrome은 최신 글이 빈 새 탭 페이지다.
const EXPLORER_FOLDER = 'Blog';
const EXPLORER_PATH = ['바탕 화면', EXPLORER_FOLDER] as const;
const EXPLORER_ITEM_COUNT = '항목 0개';
const CHROME_NEW_TAB_TITLE = '새 탭';

// 창 제목(창 영역의 접근성 이름, 작업 표시줄 창 미리보기 제목)이다.
const WINDOW_TITLES = {
  'file-explorer': `${EXPLORER_FOLDER} - 파일 탐색기`,
  chrome: `${CHROME_NEW_TAB_TITLE} - Chrome`,
} as const;

/**
 * 창 제목을 정한다. 창 영역의 접근성 이름과 작업 표시줄 창 미리보기 제목으로 쓴다.
 * @param window 열린 창
 * @returns 창 제목
 */
export function getAppWindowTitle(window: OpenWindow): string {
  return WINDOW_TITLES[window.app];
}

/**
 * 열린 창의 앱 창 조립을 고른다. 창 층(`features/window`)은 앱을 모르므로 바탕화면이 이 함수를 넘긴다.
 * 앱을 처음 열 때 탐색기는 `Blog` 폴더, Chrome은 새 탭 페이지를 보여 준다. 글과 폴더 내용은 콘텐츠를 붙일 때 채운다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @param window 열린 창
 * @param controls 창 층이 넘기는 창 동작 속성
 * @param device 화면 방식
 * @returns 앱 창
 */
export function renderAppWindow(
  window: OpenWindow,
  controls: WindowFrameControls,
  device: Device,
): ReactNode {
  if (window.app === 'chrome') {
    return (
      <ChromeWindow
        {...controls}
        device={device}
        tabs={[{ title: CHROME_NEW_TAB_TITLE, active: true }]}
        url=""
      >
        <ChromePage
          page="new-tab"
          layout={device === 'mobile' ? 'narrow' : 'wide'}
          latestPosts={[]}
          className="min-h-0 w-full flex-1"
        />
      </ChromeWindow>
    );
  }
  const path = device === 'mobile' ? EXPLORER_PATH.slice(-1) : EXPLORER_PATH;
  return (
    <ExplorerWindow
      {...controls}
      device={device}
      tabs={[{ title: EXPLORER_FOLDER, selected: true }]}
    >
      <ExplorerContent
        device={device}
        className="min-h-0 w-full flex-1"
        locationIcon={<ImageAsset name="images/file-folder" className="size-full object-contain" />}
        searchPlaceholder={`${EXPLORER_FOLDER} 검색`}
        path={path.map(
          /**
           * 위치 칸 하나를 그린다. 마지막 칸이 현재 위치다.
           * @param label 위치 이름
           * @param index 순서
           * @returns BreadcrumbItem
           */
          (label, index) => {
            const isCurrent = index === path.length - 1;
            return (
              <BreadcrumbItem
                key={label}
                label={label}
                current={isCurrent}
                showSeparator={!isCurrent}
                className="shrink-0"
              />
            );
          },
        )}
        commands={<ExplorerCommands device={device} />}
        itemCount={EXPLORER_ITEM_COUNT}
        showSelection={false}
      />
    </ExplorerWindow>
  );
}

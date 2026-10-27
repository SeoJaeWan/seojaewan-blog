import type { JSX } from 'react';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import { ChromeWindow } from '@/features/chrome/components/chrome-window/chrome-window';
import {
  type ChromeWindowContent,
  getChromeTabTitle,
} from '@/features/chrome/utils/chrome-tab-title/chrome-tab-title';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type { WindowFrameControls } from '@/shared/utils/window-rules/window-rules';
import { getLatestPosts } from '@/shared/utils/workspace-rules/workspace-rules';

// Chrome 새 탭 페이지에 보이는 최신 글 개수(피그마 Chrome/Page `Page=New tab`).
const NEW_TAB_LATEST_POST_COUNT = 6;

type ChromeWindowLayerProps = {
  /** Chrome 창 내용(탭 목록과 고른 탭) */
  content: ChromeWindowContent;
  /** 창 층이 넘기는 창 동작 속성 */
  controls: WindowFrameControls;
  /** 화면 방식 */
  device: Device;
};

/**
 * Chrome 창 하나를 작업 공간 저장소에 잇는 층이다. 탭 제목(새 탭 또는 글 제목)과 새 탭 페이지의 최신 글(휴지통에 없는 글)을
 * 저장소에서 읽어 Chrome 창 조립에 넘긴다. 글 화면, 주소창, 탭 조작은 Chrome 단계에서 붙인다(지금은 새 탭 페이지를 그린다).
 * @codocs [[Chrome:새 탭 페이지]]
 * @param props
 */
export function ChromeWindowLayer(props: ChromeWindowLayerProps): JSX.Element {
  const { content, controls, device } = props;
  const items = useWorkspaceStore((state) => state.items);
  const workspace = { items };
  return (
    <ChromeWindow
      {...controls}
      device={device}
      tabs={content.tabs.map((page, index) => ({
        title: getChromeTabTitle(workspace, page),
        active: index === content.activeTabIndex,
      }))}
      url=""
    >
      <ChromePage
        page="new-tab"
        layout={device === 'mobile' ? 'narrow' : 'wide'}
        latestPosts={getLatestPosts(workspace, NEW_TAB_LATEST_POST_COUNT).map((post) => ({
          title: post.name,
        }))}
        className="min-h-0 w-full flex-1"
      />
    </ChromeWindow>
  );
}

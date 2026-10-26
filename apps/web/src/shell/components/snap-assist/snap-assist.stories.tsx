import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { ChromePage, ChromeWindow } from '@/features/chrome/chrome';
import { SnapAssist } from '@/features/window/window';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';
import { POST_PAGE, POST_WINDOW } from '@/shared/stories/post/post';
import { PostBody } from '@/shared/stories/post-body/post-body';

import { SNAP_ASSIST_CHROME } from './story-data';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 컴포넌트(`SnapAssist`)는 `features/window`에 두고, 자리를 다른 기능(Chrome)의 조립으로 채운 이 스토리만 shell에 둔다.
// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 남은 칸 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/952×1016)로 그린다.
// 제안 창의 축소 화면은 피그마 조립처럼 실제 Chrome 창 조립(Window/Chrome)을 줄여 넣는다.
const meta = {
  title: 'Patterns/Window/SnapAssist',
  render: () => (
    <SnapAssist
      className="h-1016 w-952"
      suggestions={[
        {
          id: SNAP_ASSIST_CHROME.id,
          appIcon: <ImageAsset name="images/app-chrome.png" className="size-full object-contain" />,
          title: SNAP_ASSIST_CHROME.title,
          thumbnail: (
            <WindowThumbnail
              width={SNAP_ASSIST_CHROME.window.width}
              height={SNAP_ASSIST_CHROME.window.height}
              scale={SNAP_ASSIST_CHROME.thumbnailScale}
            >
              <ChromeWindow
                tabs={[{ title: POST_WINDOW.tabTitle, active: true }]}
                url={POST_WINDOW.url}
                className="size-full"
              >
                <ChromePage
                  page="post"
                  className="min-h-0 w-full flex-1"
                  meta={POST_PAGE.meta}
                  title={POST_PAGE.title}
                  toc={POST_PAGE.toc}
                  previousTitle={POST_PAGE.previousTitle}
                  nextTitle={POST_PAGE.nextTitle}
                >
                  <PostBody layout="wide" />
                </ChromePage>
              </ChromeWindow>
            </WindowThumbnail>
          ),
        },
      ]}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

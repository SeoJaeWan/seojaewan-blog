import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { ChromePage, ChromeWindow } from '@/features/chrome/chrome';
import { POST_PAGE, POST_WINDOW } from '@/shared/story-data/post';
import { PostBody } from '@/shared/story-data/post-body';

import { SnapAssist } from './snap-assist';
import { SNAP_ASSIST_CHROME } from './story-data';
import { WindowThumbnail } from './window-thumbnail';

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
          appIcon: <ImageAsset name="images/app-chrome" className="size-full object-contain" />,
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

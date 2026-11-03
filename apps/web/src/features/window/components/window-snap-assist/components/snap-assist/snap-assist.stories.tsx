import snapAssistExport from '@figma/patterns/window/snap-assist/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import { POST_PAGE, postPageBlocks } from '@/features/chrome/components/chrome-page/story-data';
import { ChromeWindow } from '@/features/chrome/components/chrome-window/chrome-window';
import { POST_WINDOW } from '@/features/chrome/components/chrome-window/story-data';
import { PostBlocks } from '@/features/chrome/components/post-blocks/post-blocks';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';

import { SnapAssist } from './snap-assist';
import { SNAP_ASSIST_CHROME } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 남은 칸 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기(size/snap-preview/*)로 감싼다.
// 제안 창의 축소 화면은 피그마 조립처럼 실제 Chrome 창 조립(Window/Chrome)을 줄여 넣는다.
const meta = {
  title: 'Patterns/Window/SnapAssist',
  decorators: [figmaFrame(snapAssistExport)],
  render: () => (
    <SnapAssist
      suggestions={[
        {
          id: SNAP_ASSIST_CHROME.id,
          appIcon: <ImageAsset name="images/app-chrome" />,
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
              >
                <ChromePage
                  page="post"
                  layout="wide"
                  cover={<ImageAsset name="images/wallpaper-bloom" />}
                  meta={POST_PAGE.meta}
                  title={POST_PAGE.title}
                  toc={POST_PAGE.toc}
                  previousTitle={POST_PAGE.previousTitle}
                  nextTitle={POST_PAGE.nextTitle}
                >
                  <PostBlocks
                    blocks={postPageBlocks.wide}
                    renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
                  />
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

export const Figma: Story = {};

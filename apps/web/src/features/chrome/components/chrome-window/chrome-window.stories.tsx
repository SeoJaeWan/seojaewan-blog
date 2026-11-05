import windowChromeExport from '@figma/patterns/window/chrome/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import { POST_PAGE, postPageBlocks } from '@/features/chrome/components/chrome-page/story-data';
import { POST_WINDOW } from '@/features/chrome/components/chrome-window/story-data';
import { PostBlocks } from '@/features/chrome/components/post-blocks/post-blocks';

import { ChromeWindow } from './chrome-window';
import { MULTIPLE_TAB_TITLES } from './story-data';

// 피그마 Window/Chrome의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const TABS = ['single', 'multiple'] as const;

// 피그마 조립이 Chrome/Page를 넣은 배치다. desktop 창은 넓은 글 화면, mobile 창은 좁은 글 화면을 쓴다.
const PAGE_LAYOUTS = { desktop: 'wide', mobile: 'narrow' } as const;

// 탭 수 변형마다 탭 목록이다. 지금 글 탭이 활성이다.
const TAB_LISTS = {
  single: [{ title: POST_WINDOW.tabTitle, isActive: true }],
  multiple: MULTIPLE_TAB_TITLES.map((title) => ({
    title,
    isActive: title === POST_WINDOW.tabTitle,
  })),
} as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
  tabs: (typeof TABS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 탭 내용 자리에는 피그마 조립처럼 글 화면(Chrome/Page `Page=Post`)을 넣는다.
// 피그마에 있는 변형 조합(셋)만 캡처 도구가 짝짓는다. 창 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다.
const meta = {
  title: 'Patterns/Window/Chrome',
  args: { device: 'desktop', tabs: 'single' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    tabs: { control: 'inline-radio', options: TABS },
  },
  decorators: [figmaFrame(windowChromeExport)],
  render: (args) => {
    const layout = PAGE_LAYOUTS[args.device];
    return (
      <ChromeWindow device={args.device} tabs={TAB_LISTS[args.tabs]} url={POST_WINDOW.url}>
        <ChromePage
          page="post"
          layout={layout}
          cover={<ImageAsset name="images/wallpaper-bloom" />}
          meta={POST_PAGE.meta}
          title={POST_PAGE.title}
          toc={POST_PAGE.toc}
          previousTitle={POST_PAGE.previousTitle}
          nextTitle={POST_PAGE.nextTitle}
        >
          <PostBlocks
            blocks={postPageBlocks[layout]}
            renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
          />
        </ChromePage>
      </ChromeWindow>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

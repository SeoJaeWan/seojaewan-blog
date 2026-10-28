import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { ChromePage } from '@/features/chrome/components/chrome-page/chrome-page';
import { PostBlocks } from '@/features/chrome/components/post-blocks/post-blocks';
import { POST_PAGE, POST_WINDOW, postPageBlocks } from '@/shared/stories/post/post';

import { ChromeWindow } from './chrome-window';
import { MULTIPLE_TAB_TITLES } from './story-data';

// 피그마 Window/Chrome의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const TABS = ['single', 'multiple'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1280×800, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1280 h-800', mobile: 'w-390 h-796' } as const;

// 피그마 조립이 Chrome/Page를 넣은 배치다. desktop 창은 넓은 글 화면, mobile 창은 좁은 글 화면을 쓴다.
const PAGE_LAYOUTS = { desktop: 'wide', mobile: 'narrow' } as const;

// 피그마 `figure`의 이미지 칸 높이다(Chrome/Page 스토리와 같다). 크기 토큰에 없는 값이라 인라인으로 준다.
const FIGURE_IMAGE_HEIGHTS = { wide: 420, narrow: 212 } as const;

// 탭 수 변형마다 탭 목록이다. 지금 글 탭이 활성이다.
const TAB_LISTS = {
  single: [{ title: POST_WINDOW.tabTitle, active: true }],
  multiple: MULTIPLE_TAB_TITLES.map((title) => ({
    title,
    active: title === POST_WINDOW.tabTitle,
  })),
} as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  tabs: (typeof TABS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 탭 내용 자리에는 피그마 조립처럼 글 화면(Chrome/Page `Page=Post`)을 넣는다.
// 피그마에 있는 변형 조합(셋)만 캡처 도구가 짝짓는다.
const meta = {
  title: 'Patterns/Window/Chrome',
  args: { device: 'desktop', tabs: 'single' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    tabs: { control: 'inline-radio', options: TABS },
  },
  render: (args) => {
    const layout = PAGE_LAYOUTS[args.device];
    return (
      <ChromeWindow
        device={args.device}
        tabs={TAB_LISTS[args.tabs]}
        url={POST_WINDOW.url}
        className={SIZE_CLASS_NAMES[args.device]}
      >
        <ChromePage
          page="post"
          layout={layout}
          className="min-h-0 w-full flex-1"
          cover={<ImageAsset name="images/wallpaper-bloom" />}
          meta={POST_PAGE.meta}
          title={POST_PAGE.title}
          toc={POST_PAGE.toc}
          previousTitle={POST_PAGE.previousTitle}
          nextTitle={POST_PAGE.nextTitle}
        >
          <PostBlocks
            blocks={postPageBlocks[layout]}
            renderImage={() => (
              <ImageAsset
                name="images/wallpaper-bloom"
                style={{ height: FIGURE_IMAGE_HEIGHTS[layout] }}
              />
            )}
          />
        </ChromePage>
      </ChromeWindow>
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

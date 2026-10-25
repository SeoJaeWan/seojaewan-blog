import type { Meta, StoryObj } from '@storybook/react-vite';

import { POST_PAGE, POST_WINDOW } from '@/shared/story-data/post';
import { PostBody } from '@/shared/story-data/post-body';

import { ChromePage } from './chrome-page';
import { ChromeWindow } from './chrome-window';

// 피그마 Window/Chrome의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1280×800, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1280 h-800', mobile: 'w-390 h-796' } as const;

// 피그마 조립이 Chrome/Page를 넣은 배치다. desktop 창은 넓은 글 화면, mobile 창은 좁은 글 화면을 쓴다.
const PAGE_LAYOUTS = { desktop: 'wide', mobile: 'narrow' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 탭 내용 자리에는 피그마 조립처럼 글 화면(Chrome/Page `Page=Post`)을 넣는다.
const meta = {
  title: 'Patterns/Window/Chrome',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <ChromeWindow
      device={args.device}
      tabs={[{ title: POST_WINDOW.tabTitle, active: true }]}
      url={POST_WINDOW.url}
      className={SIZE_CLASS_NAMES[args.device]}
    >
      <ChromePage
        page="post"
        layout={PAGE_LAYOUTS[args.device]}
        className="min-h-0 w-full flex-1"
        meta={POST_PAGE.meta}
        title={POST_PAGE.title}
        toc={POST_PAGE.toc}
        previousTitle={POST_PAGE.previousTitle}
        nextTitle={POST_PAGE.nextTitle}
      >
        <PostBody layout={PAGE_LAYOUTS[args.device]} />
      </ChromePage>
    </ChromeWindow>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

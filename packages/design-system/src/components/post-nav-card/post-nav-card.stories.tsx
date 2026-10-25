import type { Meta, StoryObj } from '@storybook/react-vite';

import { PostNavCard } from './post-nav-card';

// 피그마 PostNavCard의 변형 속성 값이다(정규화한 이름).
const DIRECTIONS = ['prev', 'next'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  direction: (typeof DIRECTIONS)[number];
  /** 피그마 Device 변형 */
  device: (typeof DEVICES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
};

const meta = {
  title: 'Components/PostNavCard',
  args: { direction: 'prev', device: 'desktop', title: '글 제목' },
  argTypes: {
    direction: { control: 'inline-radio', options: DIRECTIONS },
    device: { control: 'inline-radio', options: DEVICES },
    title: { control: 'text' },
  },
  render: (args) => (
    // PostNavCard는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비(354)로 감싼다.
    <div className="w-354">
      <PostNavCard direction={args.direction} device={args.device} title={args.title} />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

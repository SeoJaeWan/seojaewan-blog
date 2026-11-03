import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Scrollbar } from './scrollbar';

// 피그마 Scrollbar의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'expanded'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Scrollbar',
  args: { state: 'rest', material: 'acrylic' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 길이는 쓰는 곳이 정하므로 피그마 원본 길이(size/200)를 준다.
  render: (args) => (
    <Scrollbar state={args.state} material={args.material} className="h-size-scrollbar-length" />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 막대의 위치와 길이를 쓰는 곳이 정한 값으로 둔다 */
export const ThumbPosition: Story = {
  render: () => <Scrollbar thumbOffset={12} thumbLength={30} className="h-size-scrollbar-length" />,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.firstElementChild?.querySelector<HTMLElement>(':scope > div');

    await expect(thumb?.offsetTop).toBe(12);
    await expect(thumb?.offsetHeight).toBe(30);
  },
};

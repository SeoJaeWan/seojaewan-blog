import type { Meta, StoryObj } from '@storybook/react-vite';

import { PreviewListStory } from './preview-story';

// 피그마 Taskbar/PreviewList의 변형 속성 값이다(정규화한 이름).
const COUNTS = ['1', '2', '3'] as const;

type ParityArgs = {
  count: (typeof COUNTS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 너비가 창 개수에 맞으므로(HUG) 정수 위치(padded)에 둔다.
// 축소 화면은 피그마 조립처럼 실제 탐색기 창 조립(Window/Explorer)을 줄여 넣는다.
const meta = {
  title: 'Patterns/Taskbar/PreviewList',
  parameters: { layout: 'padded' },
  args: { count: '1' },
  argTypes: {
    count: { control: 'inline-radio', options: COUNTS },
  },
  render: (args) => <PreviewListStory count={Number(args.count)} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { PreviewListStory } from './story-preview-list';

// 피그마 Taskbar/PreviewList의 변형 속성 값이다(정규화한 이름). 모바일은 창이 여러 개일 때만 목록을 열어 Count=1이 없다.
const COUNTS = ['1', '2', '3'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  count: (typeof COUNTS)[number];
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 데스크톱은 너비가 창 개수에 맞으므로(HUG) 정수 위치(padded)에 둔다.
// 데스크톱 축소 화면은 피그마 조립처럼 실제 탐색기 창 조립(Window/Explorer)을 줄여 넣는다. 모바일은 축소 화면 없는 제목 줄이다.
const meta = {
  title: 'Patterns/Taskbar/PreviewList',
  parameters: { layout: 'padded' },
  args: { count: '1', device: 'desktop' },
  argTypes: {
    count: { control: 'inline-radio', options: COUNTS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => <PreviewListStory count={Number(args.count)} device={args.device} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

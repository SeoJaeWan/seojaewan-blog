import type { Meta, StoryObj } from '@storybook/react-vite';

import { PreviewListStory } from '@/features/taskbar/components/taskbar-apps-layer/components/taskbar-window-preview-list/story-preview-list';

import { TaskbarAppItem } from './app-item';

// 피그마 Taskbar/AppPreview의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 미리보기 목록은 버튼 위에 열리므로 캔버스 전체를 쓰고 버튼을 아래에 두며,
// 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다. 목록은 그 둘레에 함께 찍힌다.
// 피그마 조립처럼 탐색기 창 둘(Taskbar/PreviewList `Count=2`)을 띄운다.
const meta = {
  title: 'Patterns/Taskbar/AppPreview',
  parameters: { layout: 'fullscreen' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <div className="flex h-screen items-end justify-center">
      <div data-parity-target className="flex">
        <TaskbarAppItem
          app="file-explorer"
          indicator="active"
          open={args.state === 'open'}
          previews={<PreviewListStory count={2} />}
        />
      </div>
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

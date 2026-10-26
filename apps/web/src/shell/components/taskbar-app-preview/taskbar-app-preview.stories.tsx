import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarAppPreview } from '@/features/taskbar/taskbar';
import { PreviewListStory } from '@/shell/stories/preview-list-story/preview-list-story';

// 피그마 Taskbar/AppPreview의 변형 속성 값이다(정규화한 이름).
const STATES = ['closed', 'open'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// @codocs [[저장소 구성:앱 폴더 구조]]
// 컴포넌트(`TaskbarAppPreview`)는 `features/taskbar`에 두고, 자리를 다른 기능(탐색기)의 조립으로 채운 이 스토리만 shell에 둔다.
// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 미리보기 목록은 버튼 위에 열리므로 위쪽에 목록이 들어갈 자리를 두고,
// 버튼 자리(피그마 변형 노드)를 캡처 대상으로 표시한다. 목록은 그 둘레에 함께 찍힌다.
// 피그마 조립처럼 탐색기 창 둘(Taskbar/PreviewList `Count=2`)을 띄운다.
const meta = {
  title: 'Patterns/Taskbar/AppPreview',
  parameters: { layout: 'padded' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <div className="flex h-240 w-480 items-end justify-center">
      <div data-parity-target className="flex">
        <TaskbarAppPreview
          app="file-explorer"
          indicator="active"
          open={args.state === 'open'}
          previews={<PreviewListStory count={2} />}
        />
      </div>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

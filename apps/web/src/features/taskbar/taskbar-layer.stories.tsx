import type { Meta, StoryObj } from '@storybook/react-vite';

import { resetStoryStores } from '@/shared/stories/story-stores/story-stores';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/stories/story-window/story-window';

import { TaskbarLayer } from './taskbar-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 저장소(패널·창)에 이은 작업 표시줄을 그린다. Start 버튼·검색칸을 누르면 패널 저장소가 바뀌어
// 버튼이 눌린 모습이 되고, 앱 버튼을 누르면 창 저장소에 창이 열려 아래 표시가 바뀐다.
// 패널과 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/Taskbar/TaskbarLayer',
  component: TaskbarLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  args: { renderWindow: renderStoryWindow, getWindowTitle: getStoryWindowTitle },
  render: (args) => (
    <div className="fixed inset-x-0 bottom-0">
      <TaskbarLayer {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskbarLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

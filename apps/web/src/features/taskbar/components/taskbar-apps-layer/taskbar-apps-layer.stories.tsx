import type { Meta, StoryObj } from '@storybook/react-vite';

import { openStoryWindows, resetStoryStores } from '@/shared/stories/story-stores/story-stores';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/stories/story-window/story-window';

import { TaskbarAppsLayer } from './taskbar-apps-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 작업 표시줄 앱 버튼을 그린다. 버튼을 누르면 창을 열고, 최소화·복원하고,
// 창이 여럿이면 창 미리보기 목록을 연다. 창 화면은 다른 기능이라 그리지 않는다.
const meta = {
  title: 'Features/Taskbar/TaskbarAppsLayer',
  component: TaskbarAppsLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  args: { renderWindow: renderStoryWindow, getWindowTitle: getStoryWindowTitle },
  render: (args) => (
    <div className="fixed inset-x-0 bottom-0 flex justify-center">
      <TaskbarAppsLayer {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskbarAppsLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 창이 없다. 버튼을 누르면 창을 연다 */
export const Default: Story = {};

/** Chrome 창이 둘이다. Chrome 버튼을 누르면 창 미리보기 목록을 연다 */
export const WithWindows: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome', 'file-explorer']);
  },
};

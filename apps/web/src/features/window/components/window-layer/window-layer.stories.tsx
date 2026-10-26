import type { Meta, StoryObj } from '@storybook/react-vite';

import { openStoryWindows, resetStoryStores } from '@/shared/stories/story-stores/story-stores';
import {
  getStoryWindowTitle,
  renderNoStoryWindowIcon,
  renderStoryWindow,
} from '@/shared/stories/story-window/story-window';

import { WindowLayer } from './window-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 창 층을 그린다. 창을 누르면 맨 앞으로 오고, 최소화·최대화·닫기와
// 최대화 버튼의 스냅 레이아웃이 동작한다. 앱 창 조립은 다른 기능이라 빈 WindowFrame에 제목만 둔다.
const meta = {
  title: 'Features/Window/WindowLayer',
  component: WindowLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  args: {
    renderWindow: renderStoryWindow,
    getWindowTitle: getStoryWindowTitle,
    renderWindowIcon: renderNoStoryWindowIcon,
  },
  render: (args) => (
    <div className="fixed inset-0">
      <WindowLayer {...args} />
    </div>
  ),
} satisfies Meta<typeof WindowLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 창 하나를 연 채로 시작한다 */
export const OneWindow: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
};

/** 창 둘을 연 채로 시작한다. 뒤 창을 누르면 맨 앞으로 온다 */
export const TwoWindows: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
  },
};

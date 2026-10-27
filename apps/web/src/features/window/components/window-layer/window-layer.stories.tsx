import type { Meta, StoryObj } from '@storybook/react-vite';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { openStoryWindows, resetStoryStores } from '@/shared/stories/story-stores/story-stores';
import {
  getStoryWindowTitle,
  renderNoStoryWindowIcon,
  renderStoryWindow,
} from '@/shared/stories/story-window/story-window';

import { WindowLayer } from './window-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 창 층을 그린다. 창을 누르면 맨 앞으로 오고, 최소화·최대화·닫기와
// 최대화 버튼의 스냅 레이아웃이 동작한다. 제목 표시줄을 끌어 옮기고, 가장자리·모서리를 끌어 크기를 조절하며,
// 화면 왼쪽·오른쪽·위쪽 끝으로 끌면 채울 영역(SnapPreview)이 보이고 놓으면 스냅·최대화한다.
// 앱 창 조립은 다른 기능이라 빈 WindowFrame에 제목만 둔다.
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

/** 왼쪽 절반에 스냅한 탐색기와 최대화한 Chrome으로 시작한다. 제목 표시줄을 끌면 떼어져 스냅·최대화하기 전 크기로 돌아간다 */
export const SnappedAndMaximized: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
    const { snap, maximize } = useWindowStore.getState();
    snap('window-1', { layout: 'half', index: 0 });
    maximize('window-2');
  },
};

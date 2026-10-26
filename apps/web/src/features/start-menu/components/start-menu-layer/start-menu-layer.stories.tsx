import type { Meta, StoryObj } from '@storybook/react-vite';

import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { resetStoryStores } from '@/shared/stories/story-stores/story-stores';

import { StartMenuLayer } from './start-menu-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 패널 저장소에 이은 Start·검색 패널 층을 그린다. 패널을 연 채로 시작하고,
// 항목을 누르면 창 저장소에 창을 열고 패널을 닫는다. Esc·바깥 누르기로도 닫힌다. 다시 열려면 스토리를 다시 그린다.
// 작업 표시줄과 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/StartMenu/StartMenuLayer',
  component: StartMenuLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  render: () => (
    <div className="fixed inset-0">
      <StartMenuLayer />
    </div>
  ),
} satisfies Meta<typeof StartMenuLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Start 메뉴를 연 채로 시작한다 */
export const StartOpen: Story = {
  beforeEach: () => {
    usePanelStore.getState().toggleStart();
  },
};

/** 검색 패널을 연 채로 시작한다 */
export const SearchOpen: Story = {
  beforeEach: () => {
    usePanelStore.getState().openSearch();
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { resetStoryStores } from '@/shared/stories/story-stores/story-stores';

import { DesktopIconsLayer } from './desktop-icons-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 작업 공간 저장소에 이은 바탕화면 아이콘을 그린다.
// 클릭·Ctrl·Shift·끄는 사각형으로 고르고, 방향키·Ctrl + A·Enter·Delete·F2를 쓰고, 아이콘을 끌어 폴더·휴지통에 놓거나
// (자동 정렬을 끄면) 다른 칸으로 옮기고, 빈 곳·아이콘을 우클릭해 메뉴를 써 볼 수 있다.
// 연 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/Desktop/DesktopIconsLayer',
  component: DesktopIconsLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  render: () => (
    <div className="fixed inset-0">
      <DesktopIconsLayer />
    </div>
  ),
} satisfies Meta<typeof DesktopIconsLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// 자동 정렬을 끈 바탕화면이다. 아이콘을 끌어 원하는 칸에 둘 수 있다.
export const ManualArrange: Story = {
  beforeEach: () => {
    useWorkspaceStore.getState().setDesktopAutoArrange(false);
  },
};

// 휴지통에 항목이 있어 휴지통 아이콘이 찬 모양이다. 휴지통 우클릭 > 휴지통 비우기로 메시지 상자를 볼 수 있다.
export const RecycleBinFull: Story = {
  beforeEach: () => {
    useWorkspaceStore.getState().trashItems(['link:resume']);
  },
};

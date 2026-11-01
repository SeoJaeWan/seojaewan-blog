import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { openStoryWindows, resetStoryStores } from '@/shared/stories/story-stores/story-stores';
import {
  getStoryWindowTitle,
  renderNoStoryWindowIcon,
  renderStoryWindow,
} from '@/shared/stories/story-window/story-window';

import { dragStoryPointer } from './story-pointer';
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

/** 제목 표시줄을 끌어 창을 옮기고, 닫으면 남은 창이 맨 앞이 된다 */
export const DragAndClose: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const front = canvas.getByRole('region', { name: 'Chrome 2' });
    const start = useWindowStore.getState().windows['window-2']?.bounds;

    await step('제목 표시줄을 끌면 끈 만큼 저장소 자리가 옮겨진다', async () => {
      const title = within(front).getByText('Chrome 2');
      const box = title.getBoundingClientRect();
      await dragStoryPointer(title, [
        { x: box.x, y: box.y },
        { x: box.x + 40, y: box.y + 30 },
      ]);
      await expect(useWindowStore.getState().windows['window-2']?.bounds.x).toBe(
        (start?.x ?? 0) + 40,
      );
      await expect(useWindowStore.getState().interaction).toBeNull();
    });

    await step('닫으면 남은 창이 맨 앞이 된다', async () => {
      await userEvent.click(within(front).getByRole('button', { name: '닫기' }));
      await expect(canvas.getByRole('region', { name: 'File Explorer 1' })).toHaveAttribute(
        'data-window-state',
        'active',
      );
    });
  },
};

/** 모바일 폭에서는 창이 작업 영역을 가득 채운다. 뷰포트는 addon-vitest가 실제 브라우저 크기로 바꾼다 */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement }) => {
    await expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
    const region = within(canvasElement).getByRole('region', { name: 'Chrome 1' });
    // 실제 브라우저라 여는 애니메이션의 scale이 getBoundingClientRect에 들어가므로 배치 크기를 본다.
    await expect(region.offsetWidth).toBe(window.innerWidth);
  },
};

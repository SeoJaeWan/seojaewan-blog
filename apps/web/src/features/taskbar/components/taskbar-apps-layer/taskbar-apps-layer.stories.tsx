import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { openStoryWindows, resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/utils/window-rules/story-window';

import { HOVER_PREVIEW_OPEN_DELAY } from './hooks/use-hover-preview/use-hover-preview';
import { installStoryClock } from './story-clock';
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

/** 창이 있는 앱 버튼에 마우스를 400ms 올리면 미리보기를 띄운다. 가짜 시계로 지연을 흘린다 */
export const HoverPreview: Story = {
  // 축소 화면의 글자가 카드 이름에 없다고 label-content-name-mismatch에 걸린다. 지연만 보는 스토리라 창 내용을 그리지 않는다.
  args: { renderWindow: () => null },
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole('button', { name: 'Chrome' });
    const clock = installStoryClock([HOVER_PREVIEW_OPEN_DELAY]);
    try {
      // React의 onPointerEnter는 pointerover로 동작하므로 pointerEnter가 아니라 pointerOver를 보낸다.
      await fireEvent.pointerOver(button, { pointerType: 'mouse' });
      clock.tick(HOVER_PREVIEW_OPEN_DELAY - 1);
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      clock.tick(1);
      await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
    } finally {
      clock.restore();
    }
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/utils/window-rules/story-window';

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
    <div className="fixed inset-x-spacing-none bottom-spacing-none">
      <TaskbarLayer {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskbarLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Start 버튼과 검색칸이 패널 저장소에 이어져 있다. 검색칸에 입력하면 검색 패널 검색어가 바뀐다 */
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('Start 버튼을 누르면 Start 메뉴를 열고, 다시 누르면 닫는다', async () => {
      const startButton = canvas.getByRole('button', { name: '시작' });
      await userEvent.click(startButton);
      await expect(usePanelStore.getState().openPanel).toBe('start');
      await expect(startButton).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(startButton);
      await expect(usePanelStore.getState().openPanel).toBeNull();
      await expect(startButton).toHaveAttribute('aria-expanded', 'false');
    });

    // @codocs [[검색:개요]]
    await step('검색칸에 포커스하면 검색 패널을 연다. Start가 열려 있었으면 닫힌다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '시작' }));
      await expect(usePanelStore.getState().openPanel).toBe('start');
      await userEvent.click(canvas.getByRole('searchbox', { name: '검색' }));
      await expect(usePanelStore.getState().openPanel).toBe('search');
    });

    // @codocs [[검색:개요]]
    await step('검색칸에 입력한 글자가 검색어가 된다', async () => {
      const searchBox = canvas.getByRole('searchbox', { name: '검색' });
      await userEvent.type(searchBox, '리액트');
      await expect(useSearchStore.getState().panels.search.query).toBe('리액트');
      await expect(searchBox).toHaveValue('리액트');
    });

    // @codocs [[검색:개요]]
    await step(
      'Esc로 검색 패널을 닫은 뒤 이어서 입력하면 검색 패널이 다시 열리고 글자는 검색칸에 남는다',
      async () => {
        const searchBox = canvas.getByRole('searchbox', { name: '검색' });
        await userEvent.clear(searchBox);
        searchBox.focus();
        usePanelStore.getState().close();
        await waitFor(() => expect(usePanelStore.getState().openPanel).toBeNull());
        await userEvent.keyboard('가');
        await expect(usePanelStore.getState().openPanel).toBe('search');
        await expect(searchBox).toHaveValue('가');
      },
    );
  },
};

/** Start 메뉴가 열려 있고 Start 위쪽 검색칸에 검색어가 있다. 작업 표시줄 검색칸에는 나타나지 않는다 */
export const StartSearchQuery: Story = {
  beforeEach: () => {
    usePanelStore.getState().toggleStart();
    useSearchStore.getState().setQuery('start', '리액트');
  },
  play: async ({ canvasElement, step }) => {
    // @codocs [[검색:입력칸]]
    await step('Start 위쪽 검색칸의 검색어는 작업 표시줄 검색칸에 나타나지 않는다', async () => {
      await expect(within(canvasElement).getByRole('searchbox', { name: '검색' })).toHaveValue('');
    });
  },
};

/** 모바일 폭이다. 검색 입력칸 대신 검색 버튼을 두고, 누르면 검색 패널을 열고 닫는다 */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[작업 표시줄:모바일]]
    await step('검색 버튼을 누르면 검색 패널을 열고, 다시 누르면 닫는다', async () => {
      const searchButton = await canvas.findByRole('button', { name: '검색' });
      await expect(searchButton).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(searchButton);
      await expect(usePanelStore.getState().openPanel).toBe('search');
      await expect(searchButton).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(searchButton);
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });
  },
};

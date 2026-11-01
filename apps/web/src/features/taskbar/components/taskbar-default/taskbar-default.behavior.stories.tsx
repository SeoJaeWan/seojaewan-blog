import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TASKBAR_CLOCK } from './story-data';
import { TaskbarDefault } from './taskbar-default';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 피그마와 맞추는 `Patterns/Taskbar/Default`(taskbar-default.stories.tsx)는 캡처 대상이라 제목이 `Patterns/`로
// 시작해 `play`를 둘 수 없다. 한 파일에는 제목이 하나뿐이라 동작 스토리를 이 파일로 따로 둔다.
// 저장소에 잇지 않고 Start 버튼·검색칸·검색 버튼이 쓰는 곳에 알리는 일과 접근성 이름·열림 상태를 본다.
const meta = {
  title: 'Behavior/Taskbar/Default',
  component: TaskbarDefault,
  parameters: { layout: 'fullscreen' },
  args: { time: TASKBAR_CLOCK.time, date: TASKBAR_CLOCK.date, className: 'w-full' },
} satisfies Meta<typeof TaskbarDefault>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 넓은 화면이다. 가운데에 Start 버튼과 검색 입력칸, 오른쪽에 시계가 있다. Start 메뉴가 열려 있다 */
export const SearchBox: Story = {
  args: {
    search: 'box',
    isStartOpen: true,
    onStartClick: fn(),
    searchBoxProps: { onFocus: fn() },
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[작업 표시줄:구성]]
    await step('가운데에 Start 버튼과 검색 입력칸, 오른쪽에 시계가 있다', async () => {
      await expect(canvas.getByRole('button', { name: '시작' })).toBeInTheDocument();
      await expect(canvas.getByRole('searchbox', { name: '검색' })).toBeInTheDocument();
      await expect(canvas.getByText(TASKBAR_CLOCK.time)).toBeInTheDocument();
      await expect(canvas.getByText(TASKBAR_CLOCK.date)).toBeInTheDocument();
    });

    // @codocs [[작업 표시줄:구성]]
    await step(
      'Start 버튼을 누르면 쓰는 곳에 알리고, 열림 상태를 aria-expanded로 보인다',
      async () => {
        const startButton = canvas.getByRole('button', { name: '시작' });
        await expect(startButton).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(startButton);
        await expect(args.onStartClick).toHaveBeenCalledTimes(1);
      },
    );

    // @codocs [[작업 표시줄:구성]]
    await step('검색 입력칸에 포커스하면 쓰는 곳에 알린다', async () => {
      await userEvent.click(canvas.getByRole('searchbox', { name: '검색' }));
      await expect(args.searchBoxProps?.onFocus).toHaveBeenCalledTimes(1);
    });
  },
};

/** 좁은 화면이다. 검색 입력칸 대신 검색 아이콘 버튼을 둔다. 검색 패널은 닫혀 있다 */
export const SearchButton: Story = {
  args: { search: 'button', isSearchOpen: false, onSearchClick: fn() },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[작업 표시줄:구성]]
    await step('좁은 화면의 검색 버튼을 누르면 쓰는 곳에 알린다', async () => {
      const searchButton = canvas.getByRole('button', { name: '검색' });
      await expect(searchButton).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(searchButton);
      await expect(args.onSearchClick).toHaveBeenCalledTimes(1);
    });
  },
};

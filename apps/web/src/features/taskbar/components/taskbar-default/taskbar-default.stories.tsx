import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-apps-layer/components/app-item/components/taskbar-app/taskbar-app';

import { TASKBAR_CLOCK } from './story-data';
import { TaskbarDefault } from './taskbar-default';

// 피그마 Taskbar/Default의 변형 속성 값이다(정규화한 이름).
const SEARCHES = ['box', 'button'] as const;
const DEFAULT_SEARCH: (typeof SEARCHES)[number] = 'box';

// 너비는 쓰는 곳이 정하므로 피그마 원본 너비(size/1280, size/390)로 그린다.
const WIDTH_CLASS_NAMES = { box: 'w-1280', button: 'w-390' } as const;

type TaskbarArgs = ComponentProps<typeof TaskbarDefault>;

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 고정 앱(File Explorer, Chrome) 버튼을 표시 없이 둔다.
// 캡처 화면 너비(1280)가 미리보기 너비와 같아, 기본 여백을 두면 오른쪽 끝이 잘리므로 여백 없이(fullscreen) 그린다.
// 같은 파일에 동작 스토리(`SearchBox`, `SearchButton`)를 함께 둔다. 캡처 도구는 제목이 같은 스토리가 여럿이면 `Figma`를 고른다.
const meta = {
  title: 'Patterns/Taskbar/Default',
  parameters: { layout: 'fullscreen' },
  args: { search: 'box', time: TASKBAR_CLOCK.time, date: TASKBAR_CLOCK.date },
  argTypes: {
    search: { control: 'inline-radio', options: SEARCHES },
  },
  render: (args) => {
    const search = args.search ?? DEFAULT_SEARCH;
    return (
      <TaskbarDefault
        search={search}
        className={WIDTH_CLASS_NAMES[search]}
        time={args.time}
        date={args.date}
        apps={
          <>
            <TaskbarAppButton app="file-explorer" />
            <TaskbarAppButton app="chrome" />
          </>
        }
      />
    );
  },
} satisfies Meta<TaskbarArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

/** 넓은 화면이다. 가운데에 Start 버튼과 검색 입력칸, 오른쪽에 시계가 있다. Start 메뉴가 열려 있다 */
export const SearchBox: Story = {
  args: {
    search: 'box',
    isStartOpen: true,
    onStartClick: fn(),
    searchBoxProps: { onFocus: fn() },
  },
  render: (args) => <TaskbarDefault {...args} className="w-full" />,
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
  render: (args) => <TaskbarDefault {...args} className="w-full" />,
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

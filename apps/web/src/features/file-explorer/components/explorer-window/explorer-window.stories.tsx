import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PointerEvent } from 'react';
import { clearAllMocks, expect, fireEvent, fn, within } from 'storybook/test';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-body/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-body/components/explorer-content/explorer-content';
import {
  getStoryCenter,
  holdStoryDrag,
} from '@/features/file-explorer/utils/story-drag/story-drag';

import { ExplorerWindow, type ExplorerWindowTab } from './explorer-window';
import { getExplorerWindowParts } from './story-explorer-window-parts';

// 피그마 Window/Explorer의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const FOLDERS = ['blog', 'react', 'recycle-bin'] as const;
const SELECTIONS = ['none', 'single'] as const;
const TABS = ['single', 'multiple'] as const;

// 피그마 `Tabs=Multiple`의 탭 제목들이다. 현재 폴더 탭(가운데)이 고른 탭이고, 나머지 탭은 기본 폴더 아이콘을 쓴다.
const MULTIPLE_TAB_TITLES = ['React', 'Blog', 'TypeScript'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1024×640, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = {
  desktop: 'w-size-window-explorer-width h-size-window-explorer-height',
  mobile: 'w-size-screen-mobile-width h-size-window-mobile-height',
} as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
  folder: (typeof FOLDERS)[number];
  selection: (typeof SELECTIONS)[number];
  tabs: (typeof TABS)[number];
  /** 동작 스토리: 창 층의 누르기 처리를 대신하는 함수(탭에서 올라온 누르기를 받는다) */
  onWindowPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  /** 동작 스토리: 제목 표시줄을 눌러 창 끌기를 시작할 때 */
  onTitleBarPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  /** 동작 스토리: 탭을 끌어 순서를 바꿀 때 */
  onTabMove?: (from: number, to: number) => void;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마에 있는 변형 조합(여섯)만 캡처 도구가 짝짓는다.
const meta = {
  title: 'Patterns/Window/Explorer',
  args: { device: 'desktop', folder: 'blog', selection: 'none', tabs: 'single' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    folder: { control: 'inline-radio', options: FOLDERS },
    selection: { control: 'inline-radio', options: SELECTIONS },
    tabs: { control: 'inline-radio', options: TABS },
  },
  render: (args) => {
    const {
      onWindowPointerDown: handleWindowPointerDown,
      onTitleBarPointerDown: handleTitleBarPointerDown,
      onTabMove: handleTabMove,
    } = args;
    const parts = getExplorerWindowParts(args);
    const currentTab: ExplorerWindowTab = {
      title: parts.tabTitle,
      icon: parts.tabIcon,
      selected: true,
    };
    const tabs: ExplorerWindowTab[] =
      args.tabs === 'single'
        ? [currentTab]
        : MULTIPLE_TAB_TITLES.map((title) => (title === parts.tabTitle ? currentTab : { title }));
    return (
      <div onPointerDown={handleWindowPointerDown}>
        <ExplorerWindow
          device={args.device}
          tabs={tabs}
          className={SIZE_CLASS_NAMES[args.device]}
          onTitleBarPointerDown={handleTitleBarPointerDown}
          onTabMove={handleTabMove}
        >
          <ExplorerContent
            device={args.device}
            className="min-h-size-none w-full flex-flex-fill"
            locationIcon={parts.locationIcon}
            searchPlaceholder={parts.searchPlaceholder}
            path={parts.path}
            commands={<ExplorerCommands device={args.device} location={parts.commandsLocation} />}
            navigation={parts.navigation}
            itemCount={parts.itemCount}
            selection={parts.selection}
            showSelection={parts.showSelection}
          >
            {parts.items}
          </ExplorerContent>
        </ExplorerWindow>
      </div>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
export const Figma: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'aria-required-children', enabled: false }] } } },
};

// 닫기 버튼이 tablist 안에 있는 구조는 Figma 스토리와 같아 같은 규칙을 끈다.
/** 탭 줄에서 누른 것은 창을 맨 앞으로 가져오되 창 끌기는 시작하지 않고, 탭을 끌면 순서를 바꾼다 */
export const TabPointer: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'aria-required-children', enabled: false }] } } },
  args: {
    tabs: 'multiple',
    onWindowPointerDown: fn(),
    onTitleBarPointerDown: fn(),
    onTabMove: fn(),
  },
  play: async ({ canvasElement, args, step }) => {
    const {
      onWindowPointerDown: handleWindowPointerDown,
      onTitleBarPointerDown: handleTitleBarPointerDown,
      onTabMove: handleTabMove,
    } = args;
    const canvas = within(canvasElement);
    const react = canvas.getByRole('tab', { name: /React/ });
    function clearCalls(): void {
      clearAllMocks();
    }

    // @codocs [[파일 탐색기:탭]]
    await step('선택된 탭과 그 바로 왼쪽 탭은 오른쪽 구분선을 그리지 않는다', async () => {
      const tabs = canvas.getAllByRole('tab');
      for (const [index, tab] of tabs.entries()) {
        const isSelected = tab.getAttribute('aria-selected') === 'true';
        const isBeforeSelected = tabs[index + 1]?.getAttribute('aria-selected') === 'true';
        await expect(tab.parentElement).toHaveAttribute(
          'data-separator',
          String(!isSelected && !isBeforeSelected),
        );
      }
    });

    // @codocs [[파일 탐색기:탭]]
    await step('탭을 누르면 창 층의 누르기 처리(창을 맨 앞으로)까지 전해진다', async () => {
      clearCalls();
      await fireEvent.pointerDown(react);
      await expect(handleWindowPointerDown).toHaveBeenCalledTimes(1);
    });

    await step('탭의 ×를 누르면 창 층의 누르기 처리까지 전해진다', async () => {
      clearCalls();
      await fireEvent.pointerDown(canvas.getAllByRole('button', { name: '탭 닫기' })[0] ?? react);
      await expect(handleWindowPointerDown).toHaveBeenCalledTimes(1);
    });

    await step('탭 위에서 누른 것은 창 끌기를 시작하지 않는다', async () => {
      clearCalls();
      await fireEvent.pointerDown(react);
      await expect(handleTitleBarPointerDown).not.toHaveBeenCalled();
    });

    await step('탭 묶음의 여백(탭 옆)에서 누른 것도 창 끌기를 시작하지 않는다', async () => {
      clearCalls();
      await fireEvent.pointerDown(react.parentElement ?? canvasElement);
      await expect(handleTitleBarPointerDown).not.toHaveBeenCalled();
    });

    await step('탭 줄 밖의 제목 표시줄을 누르면 창 끌기를 시작한다', async () => {
      clearCalls();
      await fireEvent.pointerDown(canvas.getByRole('tablist'));
      await expect(handleTitleBarPointerDown).toHaveBeenCalledTimes(1);
    });

    await step('탭을 끌어 다른 탭 자리로 가면 그 자리로 옮긴다', async () => {
      const last = canvas.getAllByRole('tab')[2] ?? react;
      const held = await holdStoryDrag(react, [getStoryCenter(react), getStoryCenter(last)]);
      await held.release();
      await expect(handleTabMove).toHaveBeenCalledWith(0, 2);
    });
  },
};

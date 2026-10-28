import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-content/explorer-content';
import { getExplorerWindowParts } from '@/shared/stories/explorer-window-parts/explorer-window-parts';

import { ExplorerWindow, type ExplorerWindowTab } from './explorer-window';

// 피그마 Window/Explorer의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const FOLDERS = ['blog', 'react', 'recycle-bin'] as const;
const SELECTIONS = ['none', 'single'] as const;
const TABS = ['single', 'multiple'] as const;

// 피그마 `Tabs=Multiple`의 탭 제목들이다. 현재 폴더 탭(가운데)이 고른 탭이고, 나머지 탭은 기본 폴더 아이콘을 쓴다.
const MULTIPLE_TAB_TITLES = ['React', 'Blog', 'TypeScript'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1024×640, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1024 h-640', mobile: 'w-390 h-796' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  folder: (typeof FOLDERS)[number];
  selection: (typeof SELECTIONS)[number];
  tabs: (typeof TABS)[number];
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
      <ExplorerWindow device={args.device} tabs={tabs} className={SIZE_CLASS_NAMES[args.device]}>
        <ExplorerContent
          device={args.device}
          className="min-h-0 w-full flex-1"
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
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

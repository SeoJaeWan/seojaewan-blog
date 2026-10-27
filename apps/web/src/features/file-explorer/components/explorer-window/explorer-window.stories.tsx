import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExplorerCommands } from '@/features/file-explorer/components/explorer-commands/explorer-commands';
import { ExplorerContent } from '@/features/file-explorer/components/explorer-content/explorer-content';
import { getExplorerWindowParts } from '@/shared/stories/explorer-window-parts/explorer-window-parts';

import { ExplorerWindow } from './explorer-window';

// 피그마 Window/Explorer의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const FOLDERS = ['blog', 'react', 'recycle-bin'] as const;
const SELECTIONS = ['none', 'single'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1024×640, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1024 h-640', mobile: 'w-390 h-796' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  folder: (typeof FOLDERS)[number];
  selection: (typeof SELECTIONS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마에 있는 변형 조합(다섯)만 캡처 도구가 짝짓는다.
const meta = {
  title: 'Patterns/Window/Explorer',
  args: { device: 'desktop', folder: 'blog', selection: 'none' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    folder: { control: 'inline-radio', options: FOLDERS },
    selection: { control: 'inline-radio', options: SELECTIONS },
  },
  render: (args) => {
    const parts = getExplorerWindowParts(args);
    return (
      <ExplorerWindow
        device={args.device}
        tabs={[{ title: parts.tabTitle, icon: parts.tabIcon, selected: true }]}
        className={SIZE_CLASS_NAMES[args.device]}
      >
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

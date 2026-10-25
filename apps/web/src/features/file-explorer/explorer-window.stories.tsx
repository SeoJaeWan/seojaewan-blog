import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';

import {
  Asset,
  BreadcrumbItem,
  FileItem,
  ImageAsset,
  NavigationItem,
} from '@seojaewan/design-system';

import { ExplorerCommands } from './explorer-commands';
import { ExplorerContent } from './explorer-content';
import { ExplorerWindow } from './explorer-window';
import {
  FOLDER_LOCATION_ICON,
  LOCATION_NAMES,
  WINDOW_FOLDER_ITEMS,
  WINDOW_NAVIGATION,
  WINDOW_SEARCH_PLACEHOLDER,
  WINDOW_STATUS_TEXT,
} from './story-data';

// 피그마 Window/Explorer의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;
const FOLDERS = ['blog', 'react'] as const;
const SELECTIONS = ['none', 'single'] as const;

// 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기(size/1024×640, size/390×796)로 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-1024 h-640', mobile: 'w-390 h-796' } as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
  folder: (typeof FOLDERS)[number];
  selection: (typeof SELECTIONS)[number];
};

// 위치 칸 경로다. 모바일은 피그마 조립처럼 현재 폴더 칸 하나만 둔다.
const PATHS = {
  blog: [LOCATION_NAMES.desktop, LOCATION_NAMES.blog],
  react: [LOCATION_NAMES.desktop, LOCATION_NAMES.blog, LOCATION_NAMES.react],
} as const;

const NAVIGATION_ICONS = {
  desktop: (
    <Asset
      name="icons/ic_fluent_desktop_20_regular.svg"
      className="size-icon-16 text-text-fill-primary"
    />
  ),
  folder: <ImageAsset name="images/file-folder.png" className="size-full object-contain" />,
  'recycle-bin': (
    <ImageAsset name="images/file-recycle-bin-full.png" className="size-full object-contain" />
  ),
} as const;

const ITEM_ICONS = {
  folder: <ImageAsset name="images/file-folder.png" className="size-full object-contain" />,
  post: <ImageAsset name="images/file-document.png" className="size-full object-contain" />,
} as const;

/**
 * 변형에 맞는 탐색기 창을 피그마 조립과 같은 데이터로 그린다. 고른 항목(`Selection=Single`)은 첫 항목이다.
 * @param args 변형 속성
 * @returns ExplorerWindow
 */
function renderWindow(args: ParityArgs): JSX.Element {
  const { device, folder, selection } = args;
  const isDesktop = device === 'desktop';
  const isSelected = selection === 'single';
  const path = isDesktop ? PATHS[folder] : PATHS[folder].slice(-1);
  return (
    <ExplorerWindow
      device={device}
      tabs={[{ title: LOCATION_NAMES[folder], selected: true }]}
      className={SIZE_CLASS_NAMES[device]}
    >
      <ExplorerContent
        device={device}
        className="min-h-0 w-full flex-1"
        locationIcon={
          <ImageAsset name={FOLDER_LOCATION_ICON} className="size-full object-contain" />
        }
        searchPlaceholder={WINDOW_SEARCH_PLACEHOLDER}
        path={path.map(
          /**
           * 위치 칸 하나를 그린다. 마지막 칸이 현재 위치다.
           * @param label 위치 이름
           * @param index 순서
           * @returns BreadcrumbItem
           */
          (label, index) => {
            const isCurrent = index === path.length - 1;
            return (
              <BreadcrumbItem
                key={label}
                label={label}
                current={isCurrent}
                showSeparator={!isCurrent}
                className="shrink-0"
              />
            );
          },
        )}
        commands={<ExplorerCommands device={device} />}
        navigation={WINDOW_NAVIGATION.map(
          /**
           * 폴더 트리 항목 하나를 그린다.
           * @param item 트리 항목
           * @returns NavigationItem
           */
          (item) => (
            <NavigationItem
              key={item.label}
              level={item.level}
              expand={item.expand}
              selected={'selected' in item}
              label={item.label}
              icon={NAVIGATION_ICONS[item.icon]}
              className="w-240"
            />
          ),
        )}
        itemCount={WINDOW_STATUS_TEXT.itemCount[folder]}
        selection={WINDOW_STATUS_TEXT.selection}
        showSelection={isSelected}
      >
        {WINDOW_FOLDER_ITEMS[folder].map(
          /**
           * 항목 하나를 그린다.
           * @param item 항목
           * @param index 순서
           * @returns FileItem
           */
          (item, index) => (
            <FileItem
              key={item.name}
              surface="explorer"
              view="medium"
              name={item.name}
              icon={ITEM_ICONS[item.kind]}
              selected={isSelected && index === 0}
              focused={isSelected && index === 0}
            />
          ),
        )}
      </ExplorerContent>
    </ExplorerWindow>
  );
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마에 있는 변형 조합(넷)만 캡처 도구가 짝짓는다.
const meta = {
  title: 'Patterns/Window/Explorer',
  args: { device: 'desktop', folder: 'blog', selection: 'none' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
    folder: { control: 'inline-radio', options: FOLDERS },
    selection: { control: 'inline-radio', options: SELECTIONS },
  },
  render: renderWindow,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

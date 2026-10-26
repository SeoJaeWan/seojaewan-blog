import type { JSX } from 'react';

import {
  Asset,
  BreadcrumbItem,
  FileItem,
  ImageAsset,
  NavigationItem,
} from '@seojaewan/design-system';

import {
  ExplorerCommands,
  ExplorerContent,
  ExplorerWindow,
} from '@/features/file-explorer/file-explorer';

import {
  FOLDER_LOCATION_ICON,
  LOCATION_NAMES,
  WINDOW_FOLDER_ITEMS,
  WINDOW_NAVIGATION,
  WINDOW_SEARCH_PLACEHOLDER,
  WINDOW_STATUS_TEXT,
} from './explorer';

type ExplorerWindowStoryProps = {
  /** 피그마 Device */
  device: 'desktop' | 'mobile';
  /** 피그마 Folder */
  folder: 'blog' | 'react';
  /** 피그마 Selection */
  selection: 'none' | 'single';
  /** 창 크기 클래스. 창 크기는 쓰는 곳이 정한다 */
  className?: string;
  /**
   * 명령 모음 자리(Commands)를 채울지. 피그마 Taskbar/PreviewList의 축소 화면은 이 자리가 비어 있어 그 스토리만 false를 준다
   */
  showCommands?: boolean;
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
  folder: <ImageAsset name="images/file-folder" className="size-full object-contain" />,
  'recycle-bin': (
    <ImageAsset name="images/file-recycle-bin-full" className="size-full object-contain" />
  ),
} as const;

const ITEM_ICONS = {
  folder: <ImageAsset name="images/file-folder" className="size-full object-contain" />,
  post: <ImageAsset name="images/file-document" className="size-full object-contain" />,
} as const;

/**
 * 피그마 조립 `Window/Explorer`를 같은 데이터로 그리는 스토리 도우미다. 고른 항목(`Selection=Single`)은 첫 항목이다.
 * 탐색기 창 스토리와, 그 창을 `WindowThumbnail`로 줄여 넣는 작업 표시줄 창 미리보기 스토리가 함께 쓴다.
 * @param props 피그마 Window/Explorer 변형 속성과 창 크기 클래스
 * @returns ExplorerWindow
 */
export function ExplorerWindowStory(props: ExplorerWindowStoryProps): JSX.Element {
  const { device, folder, selection, className, showCommands: hasCommands = true } = props;
  const isDesktop = device === 'desktop';
  const isSelected = selection === 'single';
  const path = isDesktop ? PATHS[folder] : PATHS[folder].slice(-1);
  return (
    <ExplorerWindow
      device={device}
      tabs={[{ title: LOCATION_NAMES[folder], selected: true }]}
      className={className}
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
        commands={hasCommands ? <ExplorerCommands device={device} /> : undefined}
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

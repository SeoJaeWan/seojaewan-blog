import type { ReactNode } from 'react';

import {
  Asset,
  BreadcrumbItem,
  DetailsHeader,
  FileItem,
  FileRow,
  ImageAsset,
  NavigationItem,
} from '@seojaewan/design-system';

import {
  FOLDER_LOCATION_ICON,
  LOCATION_NAMES,
  WINDOW_FOLDER_ITEMS,
  WINDOW_NAVIGATION,
  WINDOW_RECYCLE_BIN_ITEMS,
  WINDOW_SEARCH_PLACEHOLDERS,
  WINDOW_STATUS_TEXT,
} from '@/shared/stories/explorer/explorer';

/** 피그마 Window/Explorer 변형 속성 */
type ExplorerWindowVariant = {
  /** 피그마 Device */
  device: 'desktop' | 'mobile';
  /** 피그마 Folder */
  folder: 'blog' | 'react' | 'recycle-bin';
  /** 피그마 Selection */
  selection: 'none' | 'single';
};

/** 탐색기 창 조립의 자리를 채울 내용. 탐색기 창(`ExplorerWindow`)과 본문(`ExplorerContent`)의 prop으로 넘긴다 */
type ExplorerWindowParts = {
  /** 창 탭 제목 */
  tabTitle: string;
  /** 창 탭 아이콘(현재 위치의 아이콘) */
  tabIcon: ReactNode;
  /** 명령 모음(`ExplorerCommands`)의 위치. 휴지통이면 휴지통 명령이다 */
  commandsLocation: 'folder' | 'recycle-bin';
  /** 위치 칸 앞 아이콘 */
  locationIcon: ReactNode;
  /** 검색 상자 안내 글자 */
  searchPlaceholder: string;
  /** 위치 칸(BreadcrumbItem)들 */
  path: ReactNode[];
  /** 탐색 창 폴더 트리 항목(NavigationItem)들 */
  navigation: ReactNode[];
  /** 상태 줄 항목 수 글자 */
  itemCount: string;
  /** 상태 줄 선택 글자 */
  selection: string;
  /** 상태 줄 선택 글자를 보일지 */
  showSelection: boolean;
  /** 항목 자리 내용. 폴더는 항목(FileItem)들, 휴지통은 자세히 보기(DetailsHeader와 FileRow) 하나다 */
  items: ReactNode[];
};

// 위치 칸 경로다. 모바일은 피그마 조립처럼 현재 폴더 칸 하나만 둔다.
const PATHS = {
  blog: [LOCATION_NAMES.desktop, LOCATION_NAMES.blog],
  react: [LOCATION_NAMES.desktop, LOCATION_NAMES.blog, LOCATION_NAMES.react],
  'recycle-bin': [LOCATION_NAMES['recycle-bin']],
} as const;

// 위치 아이콘(탭, 위치 칸)이다. 폴더는 file/Folder, 휴지통은 file/Recycle Bin Full이다.
const LOCATION_ICONS = {
  blog: FOLDER_LOCATION_ICON,
  react: FOLDER_LOCATION_ICON,
  'recycle-bin': 'images/file-recycle-bin-full',
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
  link: <Asset name="illustrations/file-link.svg" className="size-full" />,
} as const;

/**
 * 폴더의 항목을 보통 아이콘 보기(FileItem)로 그린다. 고른 항목(`Selection=Single`)은 첫 항목이다.
 * @param folder 폴더
 * @param isSelected 첫 항목을 골랐는지
 * @returns FileItem들
 */
function renderFolderItems(folder: 'blog' | 'react', isSelected: boolean): ReactNode[] {
  return WINDOW_FOLDER_ITEMS[folder].map(
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
      />
    ),
  );
}

/**
 * 휴지통의 지운 항목을 자세히 보기(DetailsHeader + FileRow)로 그린다. 피그마 `details` 배치 프레임(세로, 간격 0)이
 * 항목 자리 너비를 채우고, 열 머리글 줄은 열 너비만큼만 차지한다.
 * @returns 자세히 보기 하나
 */
function renderRecycleBinDetails(): ReactNode[] {
  return [
    <div key="details" className="flex w-full flex-col items-start">
      <DetailsHeader view="recycle-bin" />
      {WINDOW_RECYCLE_BIN_ITEMS.map(
        /**
         * 지운 항목 한 줄을 그린다.
         * @param item 지운 항목
         * @returns FileRow
         */
        (item) => (
          <FileRow
            key={item.name}
            view="recycle-bin"
            name={item.name}
            originalLocation={item.originalLocation}
            deletedDate={item.deletedDate}
            icon={ITEM_ICONS[item.kind]}
            className="w-full"
          />
        ),
      )}
    </div>,
  ];
}

/**
 * 피그마 조립 `Window/Explorer`의 자리를 같은 데이터로 채운 내용을 만드는 스토리 도우미다.
 * 디자인 시스템 부품만 그리고, 탐색기 창 조립(`features/file-explorer`)에 끼우는 일은 쓰는 쪽이 한다.
 * 탐색기 창 스토리와, 그 창을 `WindowThumbnail`로 줄여 넣는 작업 표시줄 창 미리보기 스토리(shell)가 함께 쓴다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param variant 피그마 Window/Explorer 변형 속성
 * @returns 탐색기 창 조립의 자리를 채울 내용
 */
export function getExplorerWindowParts(variant: ExplorerWindowVariant): ExplorerWindowParts {
  const { device, folder, selection } = variant;
  const isSelected = selection === 'single';
  const path = device === 'desktop' ? PATHS[folder] : PATHS[folder].slice(-1);
  const locationIcon = LOCATION_ICONS[folder];
  return {
    tabTitle: LOCATION_NAMES[folder],
    tabIcon: <ImageAsset name={locationIcon} className="size-full object-contain" />,
    commandsLocation: folder === 'recycle-bin' ? 'recycle-bin' : 'folder',
    locationIcon: <ImageAsset name={locationIcon} className="size-full object-contain" />,
    searchPlaceholder: WINDOW_SEARCH_PLACEHOLDERS[folder],
    path: path.map(
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
    ),
    navigation: WINDOW_NAVIGATION[folder].map(
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
    ),
    itemCount: WINDOW_STATUS_TEXT.itemCount[folder],
    selection: WINDOW_STATUS_TEXT.selection,
    showSelection: isSelected,
    items:
      folder === 'recycle-bin' ? renderRecycleBinDetails() : renderFolderItems(folder, isSelected),
  };
}

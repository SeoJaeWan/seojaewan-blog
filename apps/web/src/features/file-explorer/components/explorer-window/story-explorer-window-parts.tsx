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

import { FAVORITE_LABELS } from '@/features/file-explorer/components/navigation-favorites/story-data';

import {
  FOLDER_LOCATION_ICON,
  LOCATION_NAMES,
  WINDOW_FOLDER_ITEMS,
  WINDOW_HAS_SUBFOLDERS,
  WINDOW_NAVIGATION,
  WINDOW_RECYCLE_BIN_ITEMS,
  WINDOW_SEARCH_PLACEHOLDERS,
  WINDOW_STATUS_TEXT,
} from './story-data';

/** 피그마 Window/Explorer 변형 속성 */
type ExplorerWindowVariant = {
  device: 'desktop' | 'mobile';
  folder: 'blog' | 'react' | 'recycle-bin';
  selection: 'none' | 'single';
};

/** 즐겨찾기 칸 하나(`NavigationFavorites`의 items 한 칸). key는 칸을 구분하는 열쇠다 */
type FavoriteEntry = {
  key: string;
  item: ReactNode;
};

/** 탐색기 창 조립의 자리를 채울 내용. 탐색기 창(`ExplorerWindow`)과 본문(`ExplorerContent`)의 prop으로 넘긴다. commandsLocation은 명령 모음(`ExplorerCommands`)의 위치이며 휴지통이면 휴지통 명령이다. view는 상태 줄의 지금 보기다. favorites는 탐색 창 맨 위 즐겨찾기 칸이며 쓰는 쪽이 `NavigationFavorites`로 감싸 navigation(폴더 트리) 앞에 둔다. items는 항목 자리 내용이며 폴더는 항목(FileItem)들, 휴지통은 자세히 보기(DetailsHeader와 FileRow) 하나다. */
type ExplorerWindowParts = {
  tabTitle: string;
  tabIcon: ReactNode;
  commandsLocation: 'folder' | 'recycle-bin';
  locationIcon: ReactNode;
  searchPlaceholder: string;
  path: ReactNode[];
  favorites: FavoriteEntry[];
  navigation: ReactNode[];
  view: 'medium' | 'details';
  itemCount: string;
  selection: string;
  hasSelection: boolean;
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
  desktop: <Asset name="icons/ic_fluent_desktop_20_regular.svg" className="text-color-black-89" />,
  folder: <ImageAsset name="images/file-folder" />,
  'recycle-bin': <ImageAsset name="images/file-recycle-bin-full" />,
} as const;

const ITEM_ICONS = {
  folder: <ImageAsset name="images/file-folder" />,
  post: <ImageAsset name="images/file-document" />,
  link: <Asset name="illustrations/file-link.svg" />,
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
        size="medium"
        name={item.name}
        icon={ITEM_ICONS[item.kind]}
        isSelected={isSelected && index === 0}
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
 * 즐겨찾기 칸 하나를 그린다. 압정이 늘 보이는 폴더 칸이다.
 * @param label 칸 이름
 * @returns 즐겨찾기 칸과 열쇠
 */
function toFavoriteEntry(label: string): FavoriteEntry {
  return {
    key: label,
    item: (
      <NavigationItem
        label={label}
        hasPin
        icon={<ImageAsset name="images/file-folder" />}
        className="w-size-navigation-item-width"
      />
    ),
  };
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
    tabIcon: <ImageAsset name={locationIcon} />,
    commandsLocation: folder === 'recycle-bin' ? 'recycle-bin' : 'folder',
    locationIcon: <ImageAsset name={locationIcon} />,
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
            isCurrent={isCurrent}
            // 실제 탐색기처럼 마지막 칸 뒤 꺾쇠는 하위 폴더가 있을 때만 그린다(데스크톱).
            hasSeparator={!isCurrent || (device === 'desktop' && WINDOW_HAS_SUBFOLDERS[folder])}
            className="shrink-shrink-none"
          />
        );
      },
    ),
    favorites: FAVORITE_LABELS.map(toFavoriteEntry),
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
          isSelected={'isSelected' in item}
          isCurrent={'isSelected' in item}
          label={item.label}
          icon={NAVIGATION_ICONS[item.icon]}
          className="w-size-navigation-item-width"
        />
      ),
    ),
    // 실제 탐색기처럼 휴지통은 늘 자세히 보기이고, 폴더는 처음 보기(보통 아이콘)다. 상태 줄이 지금 보기 버튼을 켠다.
    view: folder === 'recycle-bin' ? 'details' : 'medium',
    itemCount: WINDOW_STATUS_TEXT.itemCount[folder],
    selection: WINDOW_STATUS_TEXT.selection,
    hasSelection: isSelected,
    items:
      folder === 'recycle-bin' ? renderRecycleBinDetails() : renderFolderItems(folder, isSelected),
  };
}

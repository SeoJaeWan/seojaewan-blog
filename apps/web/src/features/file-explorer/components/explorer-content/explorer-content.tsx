import type { ComponentProps, JSX, KeyboardEvent, ReactElement, ReactNode } from 'react';

import {
  ExplorerAddressRow,
  ExplorerCommandBar,
  ExplorerStatusBar,
  NavigationPane,
  ScrollArea,
} from '@seojaewan/design-system';

import {
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';

export type ExplorerContentDevice = 'desktop' | 'mobile';

/** 끌어 놓을 곳 */
type ExplorerDropTarget = {
  /** 놓으면 옮길 위치 id(폴더 id, 휴지통 id, 바탕화면은 `desktop`) */
  id: string;
  /** 위치 이름. `○○(으)로 이동` 툴팁에 쓴다 */
  name: string;
};

type AddressRowProps = ComponentProps<typeof ExplorerAddressRow>;
type StatusBarProps = ComponentProps<typeof ExplorerStatusBar>;

type ExplorerContentProps = Pick<
  AddressRowProps,
  | 'locationIcon'
  | 'searchPlaceholder'
  | 'onBack'
  | 'backDisabled'
  | 'forwardDisabled'
  | 'upDisabled'
  | 'onForward'
  | 'onUp'
  | 'onRefresh'
  | 'searchValue'
  | 'onSearchChange'
  | 'onSearch'
> &
  Pick<
    StatusBarProps,
    'itemCount' | 'selection' | 'showSelection' | 'onDetailsView' | 'onLargeIconsView'
  > & {
    /** 피그마 Device. mobile은 탐색 창과 나눔선 없이 항목만 보인다 */
    device?: ExplorerContentDevice;
    /** 주소 줄 Breadcrumb의 Items 자리. 경로 칸(BreadcrumbItem)을 넣는다 */
    path?: ReactNode;
    /** 명령 막대의 Commands 자리. `ExplorerCommands`를 넣는다 */
    commands?: ReactNode;
    /** 탐색 창의 items 자리. 폴더 트리의 NavigationItem을 넣는다. desktop만 보인다 */
    navigation?: ReactNode;
    /** 피그마 `Items` 슬롯. 현재 폴더의 항목(FileItem, 또는 DetailsHeader와 FileRow)을 넣는다 */
    children?: ReactNode;
    /**
     * 항목 자리 요소에 넘길 속성(역할·접근성 이름, 선택·우클릭·키보드 동작, ref). 바깥 배치 클래스를 더할 수 있다.
     * 주지 않으면 이름이 "폴더 내용"인 group이다
     */
    itemsAreaProps?: ComponentProps<'div'>;
    /** 항목 자리 요소를 감싸 그린다(우클릭 메뉴처럼 그 요소에 동작을 합치는 컴포넌트). 주지 않으면 그대로 그린다 */
    renderItemsArea?: (area: ReactElement) => ReactNode;
    /**
     * 끌어 놓을 곳으로 쓸 때의 위치 id와 이름(`data-drop-target`). 다른 창이나 바탕화면에서 항목을 끌어 이 본문에 놓으면
     * 그 위치로 옮긴다
     */
    dropTarget?: ExplorerDropTarget;
    /** 항목 자리를 새로 그리는 열쇠. 보는 위치가 바뀌면 바꿔, 항목 자리 스크롤을 맨 위로 돌린다 */
    itemsKey?: string;
    /** 본문에서 키를 눌렀을 때(Backspace, Alt + ← / → 같은 이동 단축키). 본문 어디를 눌러도 키를 받도록 본문이 포커스를 받는다 */
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    /** 바깥 배치 클래스. 크기는 쓰는 곳(창)이 정한다 */
    className?: string;
  };

/**
 * 탐색기 창의 본문(피그마 조립 `Explorer/Content`)을 그린다. 주소 줄, 명령 막대, 탐색 창·나눔선·항목 자리, 상태 줄을
 * 위에서부터 놓는다. 자리마다 들어갈 내용은 쓰는 쪽(`Window/Explorer`)이 넣고, 크기도 쓰는 쪽이 정한다.
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function ExplorerContent(props: ExplorerContentProps): JSX.Element {
  const {
    device = 'desktop',
    locationIcon,
    searchPlaceholder,
    searchValue,
    path,
    commands,
    navigation,
    children,
    itemCount,
    selection,
    showSelection: isSelectionShown,
    onBack: handleBack,
    backDisabled: isBackDisabled,
    forwardDisabled: isForwardDisabled,
    upDisabled: isUpDisabled,
    onForward: handleForward,
    onUp: handleUp,
    onRefresh: handleRefresh,
    onSearchChange: handleSearchChange,
    onSearch: handleSearch,
    onDetailsView: handleDetailsView,
    onLargeIconsView: handleLargeIconsView,
    onKeyDown: handleKeyDown,
    itemsKey,
    dropTarget,
    itemsAreaProps,
    renderItemsArea,
    className,
  } = props;
  const isDesktop = device === 'desktop';
  return (
    // 본문 어디를 눌러도 이동 단축키를 받도록 포커스를 받는다(Tab으로는 닿지 않는다). 포커스 고리는 그리지 않는다.
    <div
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      {...(dropTarget === undefined
        ? {}
        : {
            [DROP_TARGET_ATTRIBUTE]: dropTarget.id,
            [DROP_TARGET_NAME_ATTRIBUTE]: dropTarget.name,
          })}
      className={[
        'flex flex-col overflow-clip bg-layer-on-mica-base-alt-fill-default outline-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ExplorerAddressRow
        device={device}
        locationIcon={locationIcon}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onBack={handleBack}
        backDisabled={isBackDisabled}
        forwardDisabled={isForwardDisabled}
        upDisabled={isUpDisabled}
        onForward={handleForward}
        onUp={handleUp}
        onRefresh={handleRefresh}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
      >
        {path}
      </ExplorerAddressRow>
      <ExplorerCommandBar>
        {/* 피그마 Commands 슬롯의 배치(가로, 간격 4, 높이 size/control/height)다. 비어 있어도 높이를 지킨다 */}
        <div className="flex h-control-height items-center gap-4">{commands}</div>
      </ExplorerCommandBar>
      <div className="flex min-h-0 flex-1 overflow-clip border-t-default border-card-stroke-default bg-layer-fill-default">
        {isDesktop && (
          <>
            {/* 폴더 트리가 길면 세로로 스크롤한다. */}
            <ScrollArea material="solid" className="shrink-0">
              <NavigationPane role="tree" aria-label="탐색 창" className="shrink-0">
                {navigation}
              </NavigationPane>
            </ScrollArea>
            <div className="w-1 shrink-0 bg-divider-stroke-default" />
          </>
        )}
        {/* 항목이 넘치면 세로로 스크롤한다. */}
        <ScrollArea key={itemsKey} material="solid" className="min-w-px flex-1">
          {(renderItemsArea ?? renderAsIs)(
            <div
              role="group"
              aria-label="폴더 내용"
              {...itemsAreaProps}
              className={[
                'relative flex flex-1 flex-wrap content-start items-start gap-4 px-12 py-8',
                itemsAreaProps?.className,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {children}
            </div>,
          )}
        </ScrollArea>
      </div>
      <ExplorerStatusBar
        device={device}
        itemCount={itemCount}
        selection={selection}
        showSelection={isSelectionShown}
        onDetailsView={handleDetailsView}
        onLargeIconsView={handleLargeIconsView}
      />
    </div>
  );
}

/**
 * 항목 자리 요소를 그대로 그린다.
 * @param area 항목 자리 요소
 * @returns 그대로의 요소
 */
function renderAsIs(area: ReactElement): ReactNode {
  return area;
}

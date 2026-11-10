import type {
  ComponentProps,
  JSX,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from 'react';

import {
  cn,
  ExplorerAddressRow,
  ExplorerCommandBar,
  ExplorerStatusBar,
  LayerSurface,
  NavigationPane,
  ScrollArea,
  Separator,
} from '@seojaewan/design-system';

import {
  DROP_TARGET_ATTRIBUTE,
  DROP_TARGET_NAME_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';

export type ExplorerContentDevice = 'desktop' | 'mobile';

/** 끌어 놓을 곳. id는 놓으면 옮길 위치 id(폴더 id, 휴지통 id, 바탕화면은 `desktop`)이고 name은 `○○(으)로 이동` 툴팁에 쓴다. */
type ExplorerDropTarget = {
  id: string;
  name: string;
};

type AddressRowProps = ComponentProps<typeof ExplorerAddressRow>;
type StatusBarProps = ComponentProps<typeof ExplorerStatusBar>;

type ExplorerContentProps = Pick<
  AddressRowProps,
  | 'locationIcon'
  | 'searchPlaceholder'
  | 'onBack'
  | 'canGoBack'
  | 'canGoForward'
  | 'canGoUp'
  | 'onForward'
  | 'onUp'
  | 'onRefresh'
  | 'searchValue'
  | 'onSearchChange'
  | 'onSearch'
  | 'search'
  | 'onSearchClose'
  | 'isBreadcrumbEditing'
  | 'breadcrumbEditFieldProps'
> &
  Pick<
    StatusBarProps,
    'view' | 'itemCount' | 'selection' | 'hasSelection' | 'onDetailsView' | 'onLargeIconsView'
  > & {
    device?: ExplorerContentDevice;
    path?: ReactNode;
    commands?: ReactNode;
    navigation?: ReactNode;
    children?: ReactNode;
    itemsAreaProps?: ComponentProps<'div'>;
    renderItemsArea?: (area: ReactElement) => ReactNode;
    dropTarget?: ExplorerDropTarget;
    itemsKey?: string;
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    onAddressRowClick?: (event: MouseEvent<HTMLDivElement>) => void;
  };

/**
 * 탐색기 창의 본문(피그마 조립 `Explorer/Content`)을 그린다. 주소 줄, 명령 막대, 탐색 창·나눔선·항목 자리, 상태 줄을
 * 위에서부터 놓고, 주소 줄과 명령 막대 사이에 1px 구분선을 긋는다. 탐색 창·나눔선·항목 자리는 카드 바탕(LayerSurface) 위에 가로로 놓는다. 자리마다 들어갈 내용은 쓰는 쪽(`Window/Explorer`)이 넣고, 크기도 쓰는 쪽이 정한다.
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. mobile은 탐색 창과 나눔선 없이 항목만 보인다
 * @param props.locationIcon 피그마 Breadcrumb의 `Location icon` 인스턴스 교체 속성. 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다
 * @param props.searchPlaceholder 검색 상자의 안내 글자. desktop과 mobile 검색 줄에 보인다. 탐색기 창은 `<현재 폴더> 검색`처럼 덮어쓴다
 * @param props.searchValue 검색 상자의 입력값. 주면 쓰는 곳이 값을 정한다(위치를 옮기면 비우는 등). desktop과 mobile 검색 줄에 보인다
 * @param props.path 주소 줄 Breadcrumb의 Items 자리. 경로 칸(BreadcrumbItem)을 넣는다
 * @param props.isBreadcrumbEditing 피그마 Address=Editing. 주소 줄 Breadcrumb이 경로 칸 대신 경로 글자 입력칸을 그린다
 * @param props.breadcrumbEditFieldProps 주소 줄 Breadcrumb 편집 입력칸에 넘길 값·동작·접근성 속성. `isBreadcrumbEditing`일 때만 쓴다
 * @param props.commands 명령 막대의 Commands 자리. `ExplorerCommands`를 넣는다
 * @param props.navigation 본문 바탕(LayerSurface) 안 탐색 창(NavigationPane)의 Items 자리. 폴더 트리의 NavigationItem을 넣는다. desktop만 보인다
 * @param props.children 본문 바탕(LayerSurface) 안 `items` 영역의 내용. 현재 폴더의 항목(FileItem, 또는 DetailsHeader와 FileRow)을 넣는다. 피그마는 슬롯 안에 슬롯 속성을 둘 수 없어 이 영역을 `Window/Explorer`가 LayerSurface 슬롯을 통해 직접 채운다
 * @param props.view 상태 줄의 지금 보기. details면 자세히 버튼, large면 큰 아이콘 버튼을 켜짐으로 그린다
 * @param props.itemCount 피그마 TEXT 속성 Item count. 항목 수 글자다
 * @param props.selection 피그마 TEXT 속성 Selection. 선택 정보 글자다
 * @param props.hasSelection 피그마 BOOLEAN 속성 Has selection. 선택 정보를 보일지 정한다
 * @param props.onBack 뒤로 버튼을 눌렀을 때
 * @param props.canGoBack 뒤로 갈 수 있는지. false면 뒤로 버튼을 비활성(IconButton disabled)으로 둔다
 * @param props.canGoForward 앞으로 갈 수 있는지. false면 앞으로 버튼을 비활성으로 둔다. desktop만 보인다
 * @param props.canGoUp 상위 위치로 갈 수 있는지. false면 위로 버튼을 비활성으로 둔다. desktop만 보인다
 * @param props.onForward 앞으로 버튼을 눌렀을 때. desktop만 보인다
 * @param props.onUp 위로 버튼을 눌렀을 때. desktop만 보인다
 * @param props.onRefresh 새로고침 버튼을 눌렀을 때. desktop만 보인다
 * @param props.onSearchChange 검색 상자에 입력할 때. desktop과 mobile 검색 줄에 보인다
 * @param props.onSearch 검색 버튼을 눌렀을 때. mobile 주소 줄(search closed)만 보인다
 * @param props.search 피그마 Search. mobile에서 open이면 줄 전체가 ← 버튼과 나머지 폭을 채우는 검색 상자(검색 줄)로 바뀌고, 나타날 때 검색 상자에 포커스를 준다. desktop은 늘 검색 상자를 보이므로 이 값을 쓰지 않는다
 * @param props.onSearchClose 검색 줄의 ← 버튼을 눌렀을 때. mobile 검색 줄(search open)만 보인다
 * @param props.onDetailsView 자세히 보기 버튼을 눌렀을 때 부른다
 * @param props.onLargeIconsView 큰 아이콘 보기 버튼을 눌렀을 때 부른다
 * @param props.onAddressRowClick 주소 줄을 눌렀을 때. 경로의 빈 곳을 눌러 편집을 시작하는 데 쓴다
 * @param props.onKeyDown 본문에서 키를 눌렀을 때(Backspace, Alt + ← / → 같은 이동 단축키). 본문 어디를 눌러도 키를 받도록 본문이 포커스를 받는다
 * @param props.itemsKey 항목 자리를 새로 그리는 열쇠. 보는 위치가 바뀌면 바꿔, 항목 자리 스크롤을 맨 위로 돌린다
 * @param props.dropTarget 끌어 놓을 곳으로 쓸 때의 위치 id와 이름(`data-drop-target`). 다른 창이나 바탕화면에서 항목을 끌어 이 본문에 놓으면 그 위치로 옮긴다
 * @param props.itemsAreaProps 항목 자리 요소에 넘길 속성(역할·접근성 이름, 선택·우클릭·키보드 동작, ref). 바깥 배치 클래스를 더할 수 있다. 주지 않으면 이름이 "폴더 내용"인 group이다
 * @param props.renderItemsArea 항목 자리 요소를 감싸 그린다(우클릭 메뉴처럼 그 요소에 동작을 합치는 컴포넌트). 주지 않으면 그대로 그린다
 */
export function ExplorerContent({
  device = 'desktop',
  locationIcon,
  searchPlaceholder,
  searchValue,
  path,
  isBreadcrumbEditing,
  breadcrumbEditFieldProps,
  commands,
  navigation,
  children,
  view,
  itemCount,
  selection,
  hasSelection: isSelectionShown,
  onBack: handleBack,
  canGoBack,
  canGoForward,
  canGoUp,
  onForward: handleForward,
  onUp: handleUp,
  onRefresh: handleRefresh,
  onSearchChange: handleSearchChange,
  onSearch: handleSearch,
  search,
  onSearchClose: handleSearchClose,
  onDetailsView: handleDetailsView,
  onLargeIconsView: handleLargeIconsView,
  onKeyDown: handleKeyDown,
  onAddressRowClick: handleAddressRowClick,
  itemsKey,
  dropTarget,
  itemsAreaProps,
  renderItemsArea,
}: ExplorerContentProps): JSX.Element {
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
      className="flex flex-col overflow-clip bg-color-white-70 outline-none"
    >
      <ExplorerAddressRow
        device={device}
        locationIcon={locationIcon}
        isBreadcrumbEditing={isBreadcrumbEditing}
        breadcrumbEditFieldProps={breadcrumbEditFieldProps}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onBack={handleBack}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        canGoUp={canGoUp}
        onForward={handleForward}
        onUp={handleUp}
        onRefresh={handleRefresh}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
        search={search}
        onSearchClose={handleSearchClose}
        onClick={handleAddressRowClick}
      >
        {path}
      </ExplorerAddressRow>
      {/* 실제 Windows처럼 주소 줄과 명령 막대 사이에 1px 구분선이 있다. */}
      <Separator />
      <ExplorerCommandBar>{commands}</ExplorerCommandBar>
      <LayerSurface className="min-h-size-none flex-flex-fill">
        {isDesktop && (
          <>
            {/* 폴더 트리가 길면 세로로 스크롤한다. */}
            <ScrollArea material="solid" className="shrink-shrink-none">
              <NavigationPane role="tree" aria-label="탐색 창" className="shrink-shrink-none">
                {navigation}
              </NavigationPane>
            </ScrollArea>
            <div className="w-size-explorer-splitter-width shrink-shrink-none bg-color-black-8" />
          </>
        )}
        {/* 항목이 넘치면 세로로 스크롤한다. */}
        <ScrollArea key={itemsKey} material="solid" className="min-w-size-none flex-flex-fill">
          {(renderItemsArea ?? renderAsIs)(
            <div
              role="group"
              aria-label="폴더 내용"
              {...itemsAreaProps}
              className={cn(
                'relative flex flex-flex-fill flex-wrap content-start items-start gap-spacing-xs px-spacing-md py-spacing-sm',
                itemsAreaProps?.className,
              )}
            >
              {children}
            </div>,
          )}
        </ScrollArea>
      </LayerSurface>
      <ExplorerStatusBar
        device={device}
        view={view}
        itemCount={itemCount}
        selection={selection}
        hasSelection={isSelectionShown}
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

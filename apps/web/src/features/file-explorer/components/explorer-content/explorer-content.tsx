import type { ComponentProps, JSX, KeyboardEvent, ReactNode } from 'react';

import {
  ExplorerAddressRow,
  ExplorerCommandBar,
  ExplorerStatusBar,
  NavigationPane,
  ScrollArea,
} from '@seojaewan/design-system';

export type ExplorerContentDevice = 'desktop' | 'mobile';

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
    className,
  } = props;
  const isDesktop = device === 'desktop';
  return (
    // 본문 어디를 눌러도 이동 단축키를 받도록 포커스를 받는다(Tab으로는 닿지 않는다). 포커스 고리는 그리지 않는다.
    <div
      tabIndex={-1}
      onKeyDown={handleKeyDown}
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
          <div
            role="group"
            aria-label="폴더 내용"
            className="flex flex-wrap content-start items-start gap-4 px-12 py-8"
          >
            {children}
          </div>
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

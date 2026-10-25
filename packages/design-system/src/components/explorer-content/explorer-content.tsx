import type { ComponentProps, JSX, MouseEventHandler, ReactNode } from 'react';

import { cn } from '../../cn';
import { ExplorerAddressRow } from '../explorer-address-row/explorer-address-row';
import { ExplorerCommandBar } from '../explorer-command-bar/explorer-command-bar';
import { ExplorerStatusBar } from '../explorer-status-bar/explorer-status-bar';
import { NavigationPane } from '../navigation-pane/navigation-pane';

export type ExplorerContentDevice = 'desktop' | 'mobile';

type ExplorerContentProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Device. mobile은 탐색 창(NavigationPane)과 나눔선을 그리지 않고, 주소 줄·상태 줄도 mobile 모양이다 */
  device?: ExplorerContentDevice;
  /** 피그마 `Items` 슬롯. 현재 폴더의 항목(FileItem, 또는 DetailsHeader와 FileRow)을 넣는다 */
  children?: ReactNode;
  /** ExplorerAddressRow 안 Breadcrumb의 Items 슬롯. 경로 칸(BreadcrumbItem)을 넣는다 */
  path?: ReactNode;
  /** ExplorerAddressRow 안 Breadcrumb의 `Location icon`. 쓰는 곳마다 다르므로 꼭 넘긴다 */
  locationIcon: ReactNode;
  /** ExplorerCommandBar의 Commands 슬롯. 명령 버튼을 넣는다 */
  commands?: ReactNode;
  /** NavigationPane의 items 슬롯. 폴더 트리의 NavigationItem을 넣는다. desktop만 보인다 */
  navigation?: ReactNode;
  /** ExplorerStatusBar의 Item count. 항목 수 글자다 */
  itemCount?: string;
  /** ExplorerStatusBar의 Selection. 선택 정보 글자다 */
  selection?: string;
  /** ExplorerStatusBar의 Show selection. 선택 정보를 보일지 정한다 */
  showSelection?: boolean;
  /** 뒤로 버튼을 눌렀을 때 */
  onBack?: () => void;
  /** 앞으로 버튼을 눌렀을 때. desktop만 보인다 */
  onForward?: () => void;
  /** 위로 버튼을 눌렀을 때. desktop만 보인다 */
  onUp?: () => void;
  /** 새로고침 버튼을 눌렀을 때. desktop만 보인다 */
  onRefresh?: () => void;
  /** 검색 상자에 입력할 때. desktop만 보인다 */
  onSearchChange?: (value: string) => void;
  /** 검색 버튼을 눌렀을 때. mobile만 보인다 */
  onSearch?: () => void;
  /** 자세히 보기 버튼을 눌렀을 때. desktop만 보인다 */
  onDetailsView?: MouseEventHandler<HTMLButtonElement>;
  /** 큰 아이콘 보기 버튼을 눌렀을 때. desktop만 보인다 */
  onLargeIconsView?: MouseEventHandler<HTMLButtonElement>;
};

/**
 * 파일 탐색기 창의 본문(피그마 ExplorerContent)을 그린다.
 * ExplorerAddressRow + ExplorerCommandBar + NavigationPane + 항목 슬롯 + ExplorerStatusBar를 조립한다.
 * 크기는 갖지 않고 쓰는 곳(창)이 정한다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function ExplorerContent(props: ExplorerContentProps): JSX.Element {
  const {
    device = 'desktop',
    children,
    path,
    locationIcon,
    commands,
    navigation,
    itemCount,
    selection,
    showSelection: isSelectionShown,
    onBack: handleBack,
    onForward: handleForward,
    onUp: handleUp,
    onRefresh: handleRefresh,
    onSearchChange: handleSearchChange,
    onSearch: handleSearch,
    onDetailsView: handleDetailsView,
    onLargeIconsView: handleLargeIconsView,
    className,
    ...divProps
  } = props;
  const isDesktop = device === 'desktop';
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col overflow-clip bg-layer-on-mica-base-alt-fill-default',
        className,
      )}
    >
      <ExplorerAddressRow
        device={device}
        locationIcon={locationIcon}
        onBack={handleBack}
        onForward={handleForward}
        onUp={handleUp}
        onRefresh={handleRefresh}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
      >
        {path}
      </ExplorerAddressRow>
      <ExplorerCommandBar>{commands}</ExplorerCommandBar>
      <div className="flex min-h-px flex-1 overflow-clip border-t-default border-card-stroke-default bg-layer-fill-default">
        {isDesktop ? (
          <>
            <NavigationPane className="shrink-0">{navigation}</NavigationPane>
            <div className="w-1 shrink-0 bg-divider-stroke-default" />
          </>
        ) : null}
        <div className="flex min-w-px flex-1 flex-wrap content-start items-start gap-4 overflow-clip px-12 py-8">
          {children}
        </div>
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

import type { ComponentProps, JSX, MouseEventHandler } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

export type ExplorerStatusBarDevice = 'desktop' | 'mobile';

/** 지금 보기. 자세히·큰 아이콘 버튼을 켜짐으로 그린다. 보통 아이콘은 둘 다 꺼짐이다. */
export type ExplorerStatusBarView = 'details' | 'large' | 'medium';

type ExplorerStatusBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  device?: ExplorerStatusBarDevice;
  view?: ExplorerStatusBarView;
  itemCount?: string;
  selection?: string;
  hasSelection?: boolean;
  detailsViewLabel?: string;
  largeIconsViewLabel?: string;
  onDetailsView?: MouseEventHandler<HTMLButtonElement>;
  onLargeIconsView?: MouseEventHandler<HTMLButtonElement>;
};

/**
 * 탐색기 본문 맨 아래의 항목 수·선택 정보 줄(피그마 ExplorerStatusBar)을 그린다.
 * 너비는 쓰는 곳이 정한다. 높이는 Desktop이 보기 전환 버튼(32)에, Mobile이 글자 줄(16)에 맞춰진다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. mobile은 보기 전환 버튼을 그리지 않는다
 * @param props.view 지금 보기. details면 자세히 버튼, large면 큰 아이콘 버튼을 켜짐(IconButton isChecked)으로 그린다. medium(보통 아이콘)은 둘 다 꺼짐이다
 * @param props.itemCount 피그마 TEXT 속성 Item count. 항목 수 글자다
 * @param props.selection 피그마 TEXT 속성 Selection. 선택 정보 글자다
 * @param props.hasSelection 피그마 BOOLEAN 속성 Has selection. 선택 정보를 보일지 정한다
 * @param props.detailsViewLabel 자세히 보기 버튼의 접근성 이름
 * @param props.largeIconsViewLabel 큰 아이콘 보기 버튼의 접근성 이름
 * @param props.onDetailsView 자세히 보기 버튼을 눌렀을 때 부른다
 * @param props.onLargeIconsView 큰 아이콘 보기 버튼을 눌렀을 때 부른다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function ExplorerStatusBar({
  device = 'desktop',
  view = 'medium',
  itemCount = '항목 개수',
  selection = '선택 정보',
  hasSelection = true,
  detailsViewLabel = '자세히',
  largeIconsViewLabel = '큰 아이콘',
  onDetailsView: handleDetailsView,
  onLargeIconsView: handleLargeIconsView,
  className,
  ...divProps
}: ExplorerStatusBarProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center gap-spacing-lg overflow-clip bg-color-white-50 py-spacing-2xs pr-spacing-sm pl-spacing-lg type-caption text-color-black-89',
        className,
      )}
    >
      <span className="shrink-shrink-none whitespace-nowrap">{itemCount}</span>
      {hasSelection && <span className="shrink-shrink-none whitespace-nowrap">{selection}</span>}
      <div className="h-size-status-bar-spacer-height min-w-size-none flex-flex-fill" />
      {device === 'desktop' && (
        <>
          <IconButton
            variant="subtle"
            label={detailsViewLabel}
            icon="icons/ic_fluent_line_horizontal_4_20_regular.svg"
            isChecked={view === 'details'}
            onClick={handleDetailsView}
          />
          <IconButton
            variant="subtle"
            label={largeIconsViewLabel}
            icon="icons/ic_fluent_laptop_20_regular.svg"
            isChecked={view === 'large'}
            onClick={handleLargeIconsView}
          />
        </>
      )}
    </div>
  );
}

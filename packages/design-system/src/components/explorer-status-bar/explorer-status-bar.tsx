import type { ComponentProps, JSX, MouseEventHandler } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

export type ExplorerStatusBarDevice = 'desktop' | 'mobile';

type ExplorerStatusBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Device. mobile은 보기 전환 버튼을 그리지 않는다 */
  device?: ExplorerStatusBarDevice;
  /** 피그마 TEXT 속성 Item count. 항목 수 글자다 */
  itemCount?: string;
  /** 피그마 TEXT 속성 Selection. 선택 정보 글자다 */
  selection?: string;
  /** 피그마 BOOLEAN 속성 Show selection. 선택 정보를 보일지 정한다 */
  showSelection?: boolean;
  /** 자세히 보기 버튼의 접근성 이름 */
  detailsViewLabel?: string;
  /** 큰 아이콘 보기 버튼의 접근성 이름 */
  largeIconsViewLabel?: string;
  /** 자세히 보기 버튼을 눌렀을 때 부른다 */
  onDetailsView?: MouseEventHandler<HTMLButtonElement>;
  /** 큰 아이콘 보기 버튼을 눌렀을 때 부른다 */
  onLargeIconsView?: MouseEventHandler<HTMLButtonElement>;
};

/**
 * 탐색기 본문 맨 아래의 항목 수·선택 정보 줄(피그마 ExplorerStatusBar)을 그린다.
 * 너비는 쓰는 곳이 정한다. 높이는 Desktop이 보기 전환 버튼(32)에, Mobile이 글자 줄(16)에 맞춰진다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function ExplorerStatusBar(props: ExplorerStatusBarProps): JSX.Element {
  const {
    device = 'desktop',
    itemCount = '항목 개수',
    selection = '선택 정보',
    showSelection: isSelectionShown = true,
    detailsViewLabel = '자세히',
    largeIconsViewLabel = '큰 아이콘',
    onDetailsView: handleDetailsView,
    onLargeIconsView: handleLargeIconsView,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center gap-16 overflow-clip bg-layer-fill-default py-2 pr-8 pl-16 type-caption text-text-fill-primary',
        className,
      )}
    >
      <span className="shrink-0 whitespace-nowrap">{itemCount}</span>
      {isSelectionShown && <span className="shrink-0 whitespace-nowrap">{selection}</span>}
      <div className="h-px min-w-px flex-1" />
      {device === 'desktop' && (
        <>
          <IconButton
            variant="subtle"
            label={detailsViewLabel}
            icon="icons/ic_fluent_text_bullet_list_ltr_20_regular.svg"
            onClick={handleDetailsView}
          />
          <IconButton
            variant="subtle"
            label={largeIconsViewLabel}
            icon="icons/ic_fluent_grid_20_regular.svg"
            onClick={handleLargeIconsView}
          />
        </>
      )}
    </div>
  );
}

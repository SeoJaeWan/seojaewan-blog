import type { ComponentProps, JSX, MouseEventHandler, ReactElement, ReactNode } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';

type BrowserTabStripProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
  tabSearchLabel?: string;
  newTabLabel?: string;
  onTabSearch?: MouseEventHandler<HTMLButtonElement>;
  onNewTab?: () => void;
  renderTabSearchButton?: (button: ReactElement) => ReactNode;
};

/**
 * Chrome 창 맨 위의 탭 줄(피그마 BrowserTabStrip)을 그린다. 맨 왼쪽에 탭 검색(⌄) 버튼, 탭 슬롯 옆에 새 탭(+) 버튼이 붙는다.
 * 탭 검색 버튼은 모양과 자리만 그린다. 누르면 여는 탭 목록 메뉴는 조립이 `renderTabSearchButton`으로 버튼을 감싸 붙인다.
 * 바탕과 창 버튼은 갖지 않고, 조립이 WindowFrame의 Title bar content 슬롯에 넣는다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.children 피그마 `Tabs` 슬롯. BrowserTab을 넣는 자리다
 * @param props.tabSearchLabel 탭 검색(⌄) 버튼의 접근성 이름
 * @param props.newTabLabel 새 탭(+) 버튼의 접근성 이름
 * @param props.onTabSearch 탭 검색 버튼을 눌렀을 때 부른다
 * @param props.renderTabSearchButton 탭 검색 버튼을 감싸 그린다. 버튼과 그 버튼이 여는 메뉴를 묶는 조립(메뉴 트리거)이 버튼 요소를 받아 쓴다. 주지 않으면 버튼을 그대로 그린다
 * @param props.onNewTab 새 탭 버튼을 눌렀을 때
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function BrowserTabStrip({
  children,
  tabSearchLabel = '탭 검색',
  newTabLabel = '새 탭',
  onTabSearch: handleTabSearch,
  renderTabSearchButton,
  onNewTab: handleNewTab,
  className,
  ...divProps
}: BrowserTabStripProps): JSX.Element {
  const tabSearchButton = (
    <IconButton
      variant="chrome"
      label={tabSearchLabel}
      icon="icons/ic_material_keyboard_arrow_down_20_outlined.svg"
      onClick={handleTabSearch}
    />
  );
  return (
    <div {...divProps} className={cn('flex items-end gap-spacing-xs', className)}>
      <div className="flex shrink-shrink-none items-start overflow-clip pb-spacing-2xs">
        {renderTabSearchButton ? renderTabSearchButton(tabSearchButton) : tabSearchButton}
      </div>
      <div className="flex min-w-size-none">{children}</div>
      <div className="flex shrink-shrink-none items-start overflow-clip pb-spacing-2xs">
        <IconButton
          variant="chrome"
          label={newTabLabel}
          icon="icons/ic_material_add_20_outlined.svg"
          onClick={handleNewTab}
        />
      </div>
    </div>
  );
}

import type { ComponentProps, JSX, MouseEventHandler, ReactElement, ReactNode } from 'react';

import { cn } from '../../cn';
import { AddressBar } from '../address-bar/address-bar';
import { IconButton } from '../icon-button/icon-button';

type BrowserToolbarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 주소창 입력창의 처음 값이다(AddressBar의 `url`). 피그마 AddressBar의 TEXT 속성 URL 기본값을 따른다 */
  url?: string;
  /** 주소 입력값이 바뀔 때 부른다(AddressBar 입력창의 `onValueChange`) */
  onUrlChange?: (value: string) => void;
  /**
   * 주소창 자리. 주소창과 추천 목록을 묶은 조립처럼 쓰는 곳이 채운다. 남는 너비를 채우도록 `min-w-0 flex-1`을 준다.
   * 주지 않으면 `url`·`onUrlChange`로 AddressBar를 그린다
   */
  addressBar?: ReactNode;
  /** 앞으로 버튼을 그린다. 모바일 Chrome 창은 피그마 인스턴스에서 이 레이어를 숨겨 끈다(⋮ 메뉴로 옮긴다) */
  showForward?: boolean;
  /** 새로고침 버튼을 그린다. 모바일 Chrome 창은 피그마 인스턴스에서 이 레이어를 숨겨 끈다(⋮ 메뉴로 옮긴다) */
  showRefresh?: boolean;
  /** 뒤로 버튼을 비활성으로 둔다(뒤로 갈 기록이 없을 때) */
  backDisabled?: boolean;
  /** 앞으로 버튼을 비활성으로 둔다(앞으로 갈 기록이 없을 때) */
  forwardDisabled?: boolean;
  /** 뒤로 버튼의 접근성 이름 */
  backLabel?: string;
  /** 앞으로 버튼의 접근성 이름 */
  forwardLabel?: string;
  /** 새로고침 버튼의 접근성 이름 */
  refreshLabel?: string;
  /** 주소창 입력창의 접근성 이름 */
  addressLabel?: string;
  /** 더보기(⋮) 버튼의 접근성 이름 */
  menuLabel?: string;
  /** 뒤로 버튼을 눌렀을 때 부른다 */
  onBack?: MouseEventHandler<HTMLButtonElement>;
  /** 앞으로 버튼을 눌렀을 때 부른다 */
  onForward?: MouseEventHandler<HTMLButtonElement>;
  /** 새로고침 버튼을 눌렀을 때 부른다 */
  onRefresh?: MouseEventHandler<HTMLButtonElement>;
  /** 더보기(⋮) 버튼을 눌렀을 때 부른다 */
  onMenu?: MouseEventHandler<HTMLButtonElement>;
  /**
   * 더보기(⋮) 버튼을 감싸 그린다. 버튼과 그 버튼이 여는 메뉴를 묶는 조립(메뉴 트리거)이 버튼 요소를 받아 쓴다.
   * 주지 않으면 버튼을 그대로 그린다
   */
  renderMenuButton?: (button: ReactElement) => ReactNode;
};

/**
 * Chrome 이동 버튼과 주소창 줄(피그마 BrowserToolbar)을 그린다. Chrome 창의 탭 줄 아래에 쓴다.
 * 뒤로·앞으로·새로고침·더보기는 IconButton(`variant="chrome"`), 주소창은 AddressBar 인스턴스다.
 * 여러 곳에서 같은 방식으로 쓰는 컴포넌트라 고정 부품의 동작(버튼 클릭·비활성, 주소 입력값)만 prop으로 연다.
 * 주소창과 추천 목록을 묶는 일과 ⋮ 메뉴를 붙이는 일은 조립이 주소창 자리와 메뉴 버튼 감싸기로 한다.
 * 너비는 갖지 않는다. 피그마 원본 너비 1000은 미리보기 크기로만 두고, 쓰는 곳이 `className`으로 정한다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function BrowserToolbar(props: BrowserToolbarProps): JSX.Element {
  const {
    url,
    onUrlChange: handleUrlChange,
    addressBar,
    showForward: isForwardShown = true,
    showRefresh: isRefreshShown = true,
    backDisabled: isBackDisabled = false,
    forwardDisabled: isForwardDisabled = false,
    backLabel = '뒤로',
    forwardLabel = '앞으로',
    refreshLabel = '새로고침',
    addressLabel = '주소',
    menuLabel = '더보기',
    onBack: handleBack,
    onForward: handleForward,
    onRefresh: handleRefresh,
    onMenu: handleMenu,
    renderMenuButton,
    className,
    ...divProps
  } = props;
  const menuButton = (
    <IconButton
      variant="chrome"
      label={menuLabel}
      icon="icons/ic_fluent_more_vertical_20_regular.svg"
      onClick={handleMenu}
      className="shrink-0"
    />
  );
  return (
    <div
      {...divProps}
      className={cn('flex h-46 items-center gap-4 bg-chrome-toolbar-fill px-8', className)}
    >
      <IconButton
        variant="chrome"
        label={backLabel}
        icon="icons/ic_fluent_arrow_left_20_regular.svg"
        disabled={isBackDisabled}
        onClick={handleBack}
        className="shrink-0"
      />
      {isForwardShown && (
        <IconButton
          variant="chrome"
          label={forwardLabel}
          icon="icons/ic_fluent_arrow_right_20_regular.svg"
          disabled={isForwardDisabled}
          onClick={handleForward}
          className="shrink-0"
        />
      )}
      {isRefreshShown && (
        <IconButton
          variant="chrome"
          label={refreshLabel}
          icon="icons/ic_fluent_arrow_clockwise_20_regular.svg"
          onClick={handleRefresh}
          className="shrink-0"
        />
      )}
      {addressBar ?? (
        <AddressBar
          aria-label={addressLabel}
          url={url}
          onValueChange={handleUrlChange}
          className="min-w-0 flex-1"
        />
      )}
      {renderMenuButton === undefined ? menuButton : renderMenuButton(menuButton)}
    </div>
  );
}

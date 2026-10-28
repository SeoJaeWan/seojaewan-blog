import type {
  ComponentProps,
  JSX,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
  ReactNode,
} from 'react';

import {
  BrowserTab,
  BrowserTabStrip,
  BrowserToolbar,
  ImageAsset,
  WindowFrame,
} from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { useTabStrip } from '@/shared/hooks/use-tab-strip/use-tab-strip';

export type ChromeWindowDevice = 'desktop' | 'mobile';

/** Chrome 창의 탭 하나 */
export type ChromeWindowTab = {
  /** 탭 id. 주지 않으면 차례와 제목으로 구분한다 */
  id?: string;
  /** 탭에 보일 페이지 제목 */
  title: string;
  /** 지금 고른 탭인지. 모바일은 고른 탭의 제목을 창 제목으로 쓴다 */
  active?: boolean;
};

// 창 층이 넘기는 창 동작 속성이다. WindowFrame에 그대로 넘긴다.
type WindowFrameControlProps = Pick<
  ComponentProps<typeof WindowFrame>,
  | 'inactive'
  | 'placement'
  | 'onMinimize'
  | 'onMaximize'
  | 'onRestore'
  | 'onClose'
  | 'maximizeSlot'
  | 'onTitleBarDoubleClick'
  | 'onTitleBarPointerDown'
  | 'onKeyDown'
>;

// 도구 모음에 그대로 넘기는 이동 버튼 속성이다.
type ToolbarProps = Pick<
  ComponentProps<typeof BrowserToolbar>,
  'backDisabled' | 'forwardDisabled' | 'onBack' | 'onForward' | 'onRefresh' | 'addressBar'
>;

type ChromeWindowProps = WindowFrameControlProps &
  ToolbarProps & {
    /** 피그마 Device. desktop은 탭 줄이 있는 떠 있는 창, mobile은 탭 대신 제목 표시줄만 있는 전체화면 창이다 */
    device?: ChromeWindowDevice;
    /** 열린 탭. desktop은 탭 줄에 모두 그리고, mobile은 고른 탭의 제목만 제목 표시줄에 보인다 */
    tabs: readonly ChromeWindowTab[];
    /** 탭을 눌렀을 때. 누른 탭의 차례를 받는다 */
    onTabSelect?: (index: number) => void;
    /** 탭의 닫기 버튼을 누르거나 탭을 가운데 클릭했을 때. 닫을 탭의 차례를 받는다 */
    onTabClose?: (index: number) => void;
    /** 탭을 끌어 다른 자리로 옮길 때. 옮길 탭의 차례와 옮길 자리를 받는다 */
    onTabMove?: (from: number, to: number) => void;
    /** 새 탭(+) 버튼을 눌렀을 때 */
    onNewTab?: () => void;
    /** 주소창 주소. 주소창 자리(`addressBar`)를 주지 않을 때 쓴다 */
    url: string;
    /** ⋮ 메뉴 항목(피그마 `Menu/ChromeMore`, 모바일은 `Menu/ChromeMoreMobile`). 주지 않으면 메뉴가 없다 */
    moreMenuItems?: readonly MenuPopupEntry[];
    /** ⋮ 메뉴가 열렸는지 */
    isMoreMenuOpen?: boolean;
    /** ⋮ 메뉴를 열거나 닫으려 할 때 */
    onMoreMenuOpenChange?: (isOpen: boolean) => void;
    /** ⋮ 메뉴가 닫힌 뒤 포커스가 갈 곳(Base UI `finalFocus`). 주지 않으면 ⋮ 버튼으로 돌아간다 */
    moreMenuFinalFocus?: ComponentProps<typeof MenuButton>['finalFocus'];
    /** 탭 내용 자리. 고른 탭의 `ChromePage`를 넣는다. 도구 모음 아래 남는 자리를 채우도록 `min-h-0 w-full flex-1`을 준다 */
    children?: ReactNode;
    /** 바깥 배치 클래스. 창 크기는 쓰는 곳이 정한다 */
    className?: string;
  };

// 탭 파비콘과 모바일 앱 아이콘은 피그마 Window/Chrome의 인스턴스(file/Document, app/Chrome) 그대로다.
const tabFavicon = <ImageAsset name="images/file-document" className="size-full object-contain" />;
const chromeAppIcon = <ImageAsset name="images/app-chrome" className="size-full object-contain" />;

// 가운데 버튼의 `button` 값이다.
const MIDDLE_BUTTON = 1;

/**
 * Chrome 창(피그마 조립 `Window/Chrome`)을 그린다. WindowFrame(Chrome 재질) 위에 desktop은 탭 줄과 창 버튼,
 * mobile은 앱 아이콘·제목과 최소화·닫기 버튼을 두고, 도구 모음(BrowserToolbar) 아래에 탭 내용 자리를 둔다.
 * 모바일은 늘 전체화면이라 최대화 버튼과 도구 모음의 앞으로·새로고침을 빼고(⋮ 메뉴로 옮긴다), 탭 하나만 써서 탭 줄이 없다.
 * 창 층이 넘기는 창 동작 속성(활성, 배치, 창 버튼)과 제목 표시줄 누르기(창 끌기)는 WindowFrame에 그대로 넘긴다.
 * 탭은 클릭이나 ←/→/Home/End로 고르고(고른 탭만 Tab 키로 닿는다), × 또는 가운데 클릭으로 닫고, 끌어 순서를 바꾼다. 탭 위에서 누른 것은 창 끌기로 올리지 않는다.
 * 탭이 많으면 탭 너비를 최소 폭까지 고르게 줄이고, 더 줄일 수 없으면 탭 줄을 가로로 스크롤한다(탐색기 탭과 같다).
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:구성]]
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ChromeWindow(props: ChromeWindowProps): JSX.Element {
  const {
    device = 'desktop',
    tabs,
    url,
    onTabSelect,
    onTabClose,
    onTabMove,
    onNewTab: handleNewTab,
    backDisabled: isBackDisabled,
    forwardDisabled: isForwardDisabled,
    onBack: handleBack,
    onForward: handleForward,
    onRefresh: handleRefresh,
    addressBar,
    moreMenuItems,
    isMoreMenuOpen = false,
    onMoreMenuOpenChange: handleMoreMenuOpenChange,
    moreMenuFinalFocus,
    children,
    className,
    onTitleBarPointerDown: handleFrameTitleBarPointerDown,
    ...frameProps
  } = props;
  const isDesktop = device === 'desktop';
  const activeIndex = tabs.findIndex((tab) => tab.active === true);
  const { tabListRef, startTabDrag, getTabIndex, handleTabKeyDown } = useTabStrip({
    selectedIndex: activeIndex,
    tabCount: tabs.length,
    onTabMove,
    onTabSelect,
  });

  /**
   * ⋮ 버튼에 메뉴를 붙인다. 메뉴는 버튼 아래 오른쪽 끝에 맞춰 연다.
   * @param button ⋮ 버튼
   * @returns 메뉴 트리거
   */
  function renderMenuButton(button: ReactElement): ReactNode {
    if (moreMenuItems === undefined) {
      return button;
    }
    return (
      <MenuButton
        trigger={button}
        items={moreMenuItems}
        open={isMoreMenuOpen}
        onOpenChange={handleMoreMenuOpenChange}
        finalFocus={moreMenuFinalFocus}
        align="end"
      />
    );
  }

  /**
   * 제목 표시줄 누르기(창 끌기)를 넘기되, 탭 묶음(탭과 그 닫기 버튼, 바깥 여백) 위에서 누른 것은 거른다. 탭을 끌어 순서를 바꾸는 동작이 이 자리를 쓴다.
   * 이벤트 전파는 끊지 않아 창을 맨 앞으로 가져오는 창 층의 누르기 처리는 그대로 일어난다.
   * @param event 누르기 이벤트
   */
  function handleTitleBarPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest('[role="tablist"] > *') !== null) {
      return;
    }
    handleFrameTitleBarPointerDown?.(event);
  }

  /**
   * 탭 위에서 누르면 탭을 끌어 순서를 바꾸기 시작한다. 닫기 버튼 위에서 누른 것은 받지 않는다.
   * @param event 누르기 이벤트
   * @param index 탭 차례
   */
  function handleTabPointerDown(event: PointerEvent<HTMLDivElement>, index: number): void {
    if (event.target instanceof Element && event.target.closest('button') !== null) {
      return;
    }
    startTabDrag(event, index);
  }

  /**
   * 탭을 가운데 클릭하면 그 탭을 닫는다.
   * @param event 누르기 이벤트
   * @param index 탭 차례
   */
  function handleTabAuxClick(event: MouseEvent<HTMLDivElement>, index: number): void {
    if (event.button === MIDDLE_BUTTON) {
      onTabClose?.(index);
    }
  }

  const toolbar = (
    <BrowserToolbar
      url={url}
      addressBar={addressBar}
      showForward={isDesktop}
      showRefresh={isDesktop}
      backDisabled={isBackDisabled}
      forwardDisabled={isForwardDisabled}
      onBack={handleBack}
      onForward={handleForward}
      onRefresh={handleRefresh}
      renderMenuButton={renderMenuButton}
      className="w-full shrink-0"
    />
  );
  if (!isDesktop) {
    const activeTab = tabs[activeIndex] ?? tabs[0];
    return (
      <WindowFrame
        {...frameProps}
        onTitleBarPointerDown={handleFrameTitleBarPointerDown}
        material="chrome"
        placement="maximized"
        showMaximize={false}
        appIcon={chromeAppIcon}
        title={activeTab?.title}
        className={className}
      >
        {toolbar}
        {children}
      </WindowFrame>
    );
  }
  return (
    <WindowFrame
      {...frameProps}
      onTitleBarPointerDown={handleTitleBarPointerDown}
      titleBar="custom"
      material="chrome"
      titleBarContent={
        <BrowserTabStrip onNewTab={handleNewTab} className="min-w-0">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="탭"
            className="flex min-w-0 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {tabs.map(
              /**
               * 탭 하나를 그린다.
               * @param tab 탭
               * @param index 순서
               * @returns BrowserTab
               */
              (tab, index) => {
                return (
                  <BrowserTab
                    key={tab.id ?? `${String(index)}-${tab.title}`}
                    active={tab.active}
                    favicon={tabFavicon}
                    title={tab.title}
                    tabIndex={getTabIndex(index)}
                    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                      handleTabKeyDown(event, index);
                    }}
                    onClick={() => {
                      onTabSelect?.(index);
                    }}
                    onClose={() => {
                      onTabClose?.(index);
                    }}
                    onMouseDown={handleTabMouseDown}
                    onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
                      handleTabPointerDown(event, index);
                    }}
                    onAuxClick={(event: MouseEvent<HTMLDivElement>) => {
                      handleTabAuxClick(event, index);
                    }}
                    className="min-w-120"
                  />
                );
              },
            )}
          </div>
        </BrowserTabStrip>
      }
      className={className}
    >
      {toolbar}
      {children}
    </WindowFrame>
  );
}

/**
 * 가운데 버튼으로 누를 때 브라우저의 자동 스크롤이 시작되지 않게 한다(가운데 클릭은 탭 닫기다).
 * @param event 누르기 이벤트
 */
function handleTabMouseDown(event: MouseEvent<HTMLDivElement>): void {
  if (event.button === MIDDLE_BUTTON) {
    event.preventDefault();
  }
}

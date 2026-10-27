import type { ComponentProps, JSX, MouseEvent, PointerEvent, ReactNode } from 'react';

import { ExplorerTab, IconButton, ImageAsset, WindowFrame } from '@seojaewan/design-system';

import { useTabStrip } from '@/features/file-explorer/hooks/use-tab-strip/use-tab-strip';

export type ExplorerWindowDevice = 'desktop' | 'mobile';

/** 탐색기 창의 탭 하나 */
export type ExplorerWindowTab = {
  /** 탭 id. 주지 않으면 차례와 제목으로 구분한다 */
  id?: string;
  /** 탭 제목(현재 폴더 이름) */
  title: string;
  /** 지금 고른 탭인지. 모바일은 고른 탭의 제목을 창 제목으로 쓴다 */
  selected?: boolean;
  /** 피그마 ExplorerTab Icon. 현재 위치의 아이콘(16px)이다. 주지 않으면 폴더 아이콘(file/Folder)이다 */
  icon?: ReactNode;
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
>;

type ExplorerWindowProps = WindowFrameControlProps & {
  /** 피그마 Device. desktop은 탭이 있는 떠 있는 창, mobile은 탭 대신 제목 표시줄만 있는 전체화면 창이다 */
  device?: ExplorerWindowDevice;
  /** 열린 탭. desktop은 제목 표시줄에 모두 그리고, mobile은 고른 탭의 제목만 제목 표시줄에 보인다 */
  tabs: readonly ExplorerWindowTab[];
  /** 탭을 눌렀을 때. 누른 탭의 차례를 받는다 */
  onTabSelect?: (index: number) => void;
  /** 탭의 닫기 버튼을 누르거나 탭을 가운데 클릭했을 때. 닫을 탭의 차례를 받는다 */
  onTabClose?: (index: number) => void;
  /** 탭을 끌어 다른 자리로 옮길 때. 옮길 탭의 차례와 옮길 자리를 받는다 */
  onTabMove?: (from: number, to: number) => void;
  /** 새 탭(+) 버튼을 눌렀을 때 */
  onNewTab?: () => void;
  /** 탭 내용 자리. 고른 탭의 `ExplorerContent`를 넣는다. 남는 자리를 채우도록 `min-h-0 w-full flex-1`을 준다 */
  children?: ReactNode;
  /** 바깥 배치 클래스. 창 크기는 쓰는 곳이 정한다 */
  className?: string;
};

// 탭 기본 아이콘과 모바일 앱 아이콘은 피그마 Window/Explorer의 인스턴스(file/Folder, app/File Explorer) 그대로다.
const folderTabIcon = <ImageAsset name="images/file-folder" className="size-full object-contain" />;
const explorerAppIcon = (
  <ImageAsset name="images/app-file-explorer" className="size-full object-contain" />
);

// 가운데 버튼의 `button` 값이다.
const MIDDLE_BUTTON = 1;

/**
 * 탐색기 창(피그마 조립 `Window/Explorer`)을 그린다. WindowFrame(마이카 재질) 위에 desktop은 폴더 탭·새 탭 버튼과
 * 창 버튼, mobile은 앱 아이콘·제목과 최소화·닫기 버튼을 두고, 그 아래에 탭 내용 자리를 둔다.
 * 모바일은 늘 전체화면이라 최대화 버튼을 빼고, 탭 하나만 쓰므로 탭 줄이 없다.
 * 창 층이 넘기는 창 동작 속성(활성, 배치, 창 버튼)과 제목 표시줄 누르기(창 끌기)는 WindowFrame에 그대로 넘긴다.
 * 탭은 클릭으로 고르고, × 또는 가운데 클릭으로 닫는다. 탭 위에서 누른 것은 창 끌기로 올리지 않는다.
 * 탭이 많으면 탭 너비를 최소 폭까지 고르게 줄이고, 더 줄일 수 없으면 탭 줄을 가로로 스크롤한다. 탭을 끌어 순서를 바꾼다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ExplorerWindow(props: ExplorerWindowProps): JSX.Element {
  const {
    device = 'desktop',
    tabs,
    onTabSelect,
    onTabClose,
    onTabMove,
    onNewTab: handleNewTab,
    children,
    className,
    onTitleBarPointerDown: handleFrameTitleBarPointerDown,
    ...frameProps
  } = props;
  const selectedIndex = tabs.findIndex((tab) => tab.selected === true);
  const { tabListRef, startTabDrag } = useTabStrip({
    selectedIndex,
    tabCount: tabs.length,
    onTabMove,
  });

  /**
   * 제목 표시줄 누르기(창 끌기)를 넘기되, 탭 위에서 누른 것은 거른다. 탭을 끌어 순서를 바꾸는 동작이 이 자리를 쓴다.
   * 이벤트 전파는 끊지 않아 창을 맨 앞으로 가져오는 창 층의 누르기 처리는 그대로 일어난다.
   * @param event 누르기 이벤트
   */
  function handleTitleBarPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest('[role="tab"]') !== null) {
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
  if (device === 'mobile') {
    const selectedTab = tabs.find((tab) => tab.selected === true) ?? tabs[0];
    return (
      <WindowFrame
        {...frameProps}
        onTitleBarPointerDown={handleFrameTitleBarPointerDown}
        placement="maximized"
        showMaximize={false}
        appIcon={explorerAppIcon}
        title={selectedTab?.title}
        className={className}
      >
        {children}
      </WindowFrame>
    );
  }
  return (
    <WindowFrame
      {...frameProps}
      onTitleBarPointerDown={handleTitleBarPointerDown}
      titleBar="custom"
      titleBarContent={
        <>
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="탭"
            className="flex min-w-0 items-end overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {tabs.map(
              /**
               * 폴더 탭 하나를 그린다.
               * @param tab 탭
               * @param index 순서
               * @returns ExplorerTab
               */
              (tab, index) => {
                return (
                  <ExplorerTab
                    key={tab.id ?? `${String(index)}-${tab.title}`}
                    selected={tab.selected}
                    icon={tab.icon ?? folderTabIcon}
                    title={tab.title}
                    onClick={() => onTabSelect?.(index)}
                    onClose={() => onTabClose?.(index)}
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
          <IconButton
            variant="subtle"
            label="새 탭"
            icon="icons/ic_fluent_add_20_regular.svg"
            onClick={handleNewTab}
            className="shrink-0"
          />
        </>
      }
      className={className}
    >
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

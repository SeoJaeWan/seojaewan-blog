import type { ComponentProps, JSX, ReactNode } from 'react';

import { ExplorerTab, IconButton, ImageAsset, WindowFrame } from '@seojaewan/design-system';

export type ExplorerWindowDevice = 'desktop' | 'mobile';

/** 탐색기 창의 탭 하나 */
export type ExplorerWindowTab = {
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

/**
 * 탐색기 창(피그마 조립 `Window/Explorer`)을 그린다. WindowFrame(마이카 재질) 위에 desktop은 폴더 탭·새 탭 버튼과
 * 창 버튼, mobile은 앱 아이콘·제목과 최소화·닫기 버튼을 두고, 그 아래에 탭 내용 자리를 둔다.
 * 모바일은 늘 전체화면이라 최대화 버튼을 뺀다. 창 층이 넘기는 창 동작 속성(활성, 배치, 창 버튼)은 WindowFrame에 그대로 넘긴다.
 * 제목 표시줄 누르기(창 끌기)도 그대로 넘긴다. 탭 열고 닫기 같은 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ExplorerWindow(props: ExplorerWindowProps): JSX.Element {
  const { device = 'desktop', tabs, children, className, ...frameProps } = props;
  if (device === 'mobile') {
    const selectedTab = tabs.find((tab) => tab.selected === true) ?? tabs[0];
    return (
      <WindowFrame
        {...frameProps}
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
      titleBar="custom"
      titleBarContent={
        <>
          {tabs.map(
            /**
             * 폴더 탭 하나를 그린다.
             * @param tab 탭
             * @param index 순서
             * @returns ExplorerTab
             */
            (tab, index) => (
              <ExplorerTab
                key={`${String(index)}-${tab.title}`}
                selected={tab.selected}
                icon={tab.icon ?? folderTabIcon}
                title={tab.title}
                className="shrink-0"
              />
            ),
          )}
          <IconButton
            variant="subtle"
            label="새 탭"
            icon="icons/ic_fluent_add_20_regular.svg"
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

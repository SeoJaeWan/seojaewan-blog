import type { JSX, ReactNode } from 'react';

import {
  BrowserTab,
  BrowserTabStrip,
  BrowserToolbar,
  ImageAsset,
  WindowFrame,
} from '@seojaewan/design-system';

export type ChromeWindowDevice = 'desktop' | 'mobile';

/** Chrome 창의 탭 하나 */
export type ChromeWindowTab = {
  /** 탭에 보일 페이지 제목 */
  title: string;
  /** 지금 고른 탭인지. 모바일은 고른 탭의 제목을 창 제목으로 쓴다 */
  active?: boolean;
};

type ChromeWindowProps = {
  /** 피그마 Device. desktop은 탭 줄이 있는 떠 있는 창, mobile은 탭 대신 제목 표시줄만 있는 전체화면 창이다 */
  device?: ChromeWindowDevice;
  /** 열린 탭. desktop은 탭 줄에 모두 그리고, mobile은 고른 탭의 제목만 제목 표시줄에 보인다 */
  tabs: readonly ChromeWindowTab[];
  /** 주소창 주소 */
  url: string;
  /** 탭 내용 자리. 고른 탭의 `ChromePage`를 넣는다. 도구 모음 아래 남는 자리를 채우도록 `min-h-0 w-full flex-1`을 준다 */
  children?: ReactNode;
  /** 바깥 배치 클래스. 창 크기는 쓰는 곳이 정한다 */
  className?: string;
};

// 탭 파비콘과 모바일 앱 아이콘은 피그마 Window/Chrome의 인스턴스(file/Document, app/Chrome) 그대로다.
const tabFavicon = (
  <ImageAsset name="images/file-document.png" className="size-full object-contain" />
);
const chromeAppIcon = (
  <ImageAsset name="images/app-chrome.png" className="size-full object-contain" />
);

/**
 * Chrome 창(피그마 조립 `Window/Chrome`)을 그린다. WindowFrame(Chrome 재질) 위에 desktop은 탭 줄과 창 버튼,
 * mobile은 앱 아이콘·제목과 최소화·닫기 버튼을 두고, 도구 모음(BrowserToolbar) 아래에 탭 내용 자리를 둔다.
 * 모바일은 늘 전체화면이라 최대화 버튼과 도구 모음의 앞으로·새로고침을 뺀다.
 * 창 이동·크기 조절·스냅, 탭 열고 닫기 같은 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ChromeWindow(props: ChromeWindowProps): JSX.Element {
  const { device = 'desktop', tabs, url, children, className } = props;
  const isDesktop = device === 'desktop';
  const toolbar = (
    <BrowserToolbar
      url={url}
      showForward={isDesktop}
      showRefresh={isDesktop}
      className="w-full shrink-0"
    />
  );
  if (!isDesktop) {
    const activeTab = tabs.find((tab) => tab.active === true) ?? tabs[0];
    return (
      <WindowFrame
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
      titleBar="custom"
      material="chrome"
      titleBarContent={
        <BrowserTabStrip>
          {tabs.map(
            /**
             * 탭 하나를 그린다.
             * @param tab 탭
             * @param index 순서
             * @returns BrowserTab
             */
            (tab, index) => (
              <BrowserTab
                key={`${String(index)}-${tab.title}`}
                active={tab.active}
                favicon={tabFavicon}
                title={tab.title}
              />
            ),
          )}
        </BrowserTabStrip>
      }
      className={className}
    >
      {toolbar}
      {children}
    </WindowFrame>
  );
}

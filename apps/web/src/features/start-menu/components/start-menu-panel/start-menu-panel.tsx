import type { ComponentProps, CSSProperties, JSX, ReactNode } from 'react';

import {
  cn,
  ProfileButton,
  SearchBox,
  ShellSurface,
  StartMenuFooter,
} from '@seojaewan/design-system';

export type StartMenuPanelDevice = 'desktop' | 'mobile';

/** Start 패널 바탕 요소를 찾는 선택자. 범주 펼침 팝업이 이 요소의 가운데에 열린다 */
export const START_MENU_PANEL_SELECTOR = '[data-start-menu-panel]';

type StartMenuPanelProps = {
  device?: StartMenuPanelDevice;
  searchBoxProps?: Omit<ComponentProps<typeof SearchBox>, 'variant' | 'className'>;
  profileName: string;
  profilePhoto: ReactNode;
  powerButton?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * 작업 표시줄 Start 버튼으로 여는 Start 메뉴(피그마 조립 `Start/Menu`)를 그린다.
 * 패널 크기와 재질은 ShellSurface가 정하고, 이 조립은 위 검색 띠, 본문 자리, 아래 사용자 띠(프로필과 전원 버튼 자리)만 갖는다.
 * 두 띠는 셸 아크릴 그대로이고 본문은 반투명 흰색을 덧칠하며, 띠와 본문 사이는 구분선으로 나눈다.
 * 본문과 전원 버튼은 쓰는 쪽이 넣는다. 열고 닫기, 검색 입력, 프로필 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:구성]]
 * @codocs [[Start 메뉴:모바일]]
 * @codocs [[디자인 기반:재질 효과]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 모바일은 검색 띠의 좌우 여백이 16으로 좁다. 패널 크기와 모서리는 ShellSurface가 정한다
 * @param props.searchBoxProps 위쪽 검색 입력칸(SearchBox `Appearance=Pill`)에 넘길 속성
 * @param props.profileName 아래 줄 프로필 이름
 * @param props.profilePhoto 아래 줄 프로필 사진(32×32)
 * @param props.powerButton 아래 줄 오른쪽 자리. 쓰는 쪽이 전원 버튼(`Start/PowerButton`)을 넣는다
 * @param props.children 본문 자리. 쓰는 쪽이 Start 본문(`Start/Body`)을 넣는다
 * @param props.className 바깥 배치 클래스
 * @param props.style 실행 중에 정해지는 크기(패널 최대 높이). 쓰는 곳(패널 층)이 화면 높이에 맞춰 넘긴다
 */
export function StartMenuPanel({
  device = 'desktop',
  searchBoxProps,
  profileName,
  profilePhoto,
  powerButton,
  children,
  className,
  style,
}: StartMenuPanelProps): JSX.Element {
  const isMobile = device === 'mobile';
  return (
    <ShellSurface device={device} className={className} style={style} data-start-menu-panel="">
      <div className="flex size-full flex-col">
        {/* 피그마 `search band`다. 셸 아크릴 위에 그대로 두고, 아래 본문과의 사이를 반투명 검정 구분선으로 나눈다.
            좌우 여백은 데스크톱 32, 모바일 16이다 */}
        <div
          className={cn(
            'flex w-full shrink-shrink-none border-b-stroke-width-default border-color-black-6 py-spacing-lg',
            isMobile ? 'px-spacing-lg' : 'px-spacing-3xl',
          )}
        >
          <SearchBox
            {...searchBoxProps}
            variant="pill"
            className="min-w-size-none flex-flex-fill"
          />
        </div>
        {/* 피그마 `body`다. 셸 아크릴 위에 반투명 흰색을 덧칠해 위아래 띠보다 밝게 한다.
            본문(`Start/Body`)은 FILL이라 남는 높이로 늘린다. 본문은 패널 폭을 채워 스크롤바가 패널 가장자리에 붙고 내용 여백은 본문 안에서 준다 */}
        <div className="flex min-h-size-none w-full flex-flex-fill flex-col bg-color-white-25 [&>*]:min-h-size-none [&>*]:flex-flex-fill">
          {children}
        </div>
        <StartMenuFooter className="w-full shrink-shrink-none">
          <ProfileButton
            photo={profilePhoto}
            name={profileName}
            className="min-w-size-none flex-flex-fill"
          />
          {powerButton}
        </StartMenuFooter>
      </div>
    </ShellSurface>
  );
}

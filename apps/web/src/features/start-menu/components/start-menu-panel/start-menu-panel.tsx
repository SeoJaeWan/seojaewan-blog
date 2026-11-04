import type { ComponentProps, CSSProperties, JSX, ReactNode } from 'react';

import { ProfileButton, SearchBox, ShellSurface, StartMenuFooter } from '@seojaewan/design-system';

export type StartMenuPanelDevice = 'desktop' | 'mobile';

type StartMenuPanelProps = {
  /** 피그마 Device. 모바일은 검색 줄의 좌우 여백이 16으로 좁다. 패널 크기와 모서리는 ShellSurface가 정한다 */
  device?: StartMenuPanelDevice;
  /** 위쪽 검색 입력칸(SearchBox `Appearance=Pill`)에 넘길 속성 */
  searchBoxProps?: Omit<ComponentProps<typeof SearchBox>, 'variant' | 'className'>;
  /** 아래 줄 프로필 이름 */
  profileName: string;
  /** 아래 줄 프로필 사진(32×32) */
  profilePhoto: ReactNode;
  /** 아래 줄 오른쪽 자리. 쓰는 쪽이 전원 버튼(`Start/PowerButton`)을 넣는다 */
  powerButton?: ReactNode;
  /** 본문 자리. 쓰는 쪽이 Start 본문(`Start/Body`)을 넣는다 */
  children?: ReactNode;
  /** 바깥 배치 클래스 */
  className?: string;
  /** 실행 중에 정해지는 크기(패널 최대 높이). 쓰는 곳(패널 층)이 화면 높이에 맞춰 넘긴다 */
  style?: CSSProperties;
};

/**
 * 작업 표시줄 Start 버튼으로 여는 Start 메뉴(피그마 조립 `Start/Menu`)를 그린다.
 * 패널 크기와 재질은 ShellSurface가 정하고, 이 조립은 위 검색 입력칸, 본문 자리, 아래 줄(프로필과 전원 버튼 자리)만 갖는다.
 * 본문과 전원 버튼은 쓰는 쪽이 넣는다. 열고 닫기, 검색 입력, 프로필 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Start 메뉴:구성]]
 * @codocs [[Start 메뉴:모바일]]
 * @param props
 */
export function StartMenuPanel(props: StartMenuPanelProps): JSX.Element {
  const {
    device = 'desktop',
    searchBoxProps,
    profileName,
    profilePhoto,
    powerButton,
    children,
    className,
    style,
  } = props;
  const isMobile = device === 'mobile';
  return (
    <ShellSurface device={device} className={className} style={style}>
      <div className="flex size-full flex-col">
        {/* 피그마 `body` 배치 프레임이다. 가로 여백 없이 위 32 아래에 검색 줄과 본문을 간격 16으로 쌓는다.
            가로 여백은 줄마다 갖는다. 검색 줄(`search row`)은 자기 좌우 여백(데스크톱 32, 모바일 16)을 갖고,
            본문은 패널 폭을 채워 스크롤바가 패널 가장자리에 붙고 내용 여백은 본문 안에서 준다 */}
        <div className="flex min-h-size-none w-full flex-flex-fill flex-col items-start gap-spacing-lg pt-spacing-3xl">
          <div
            className={
              isMobile
                ? 'flex w-full shrink-shrink-none px-spacing-lg'
                : 'flex w-full shrink-shrink-none px-spacing-3xl'
            }
          >
            <SearchBox
              {...searchBoxProps}
              variant="pill"
              className="min-w-size-none flex-flex-fill"
            />
          </div>
          {/* 본문 자리다. 피그마 `Start/Body`는 FILL이라 넣은 본문을 남는 높이로 늘린다(너비는 세로 배치가 늘린다) */}
          <div className="flex min-h-size-none w-full flex-flex-fill flex-col [&>*]:min-h-size-none [&>*]:flex-flex-fill">
            {children}
          </div>
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

import type { ComponentProps, CSSProperties, JSX, ReactNode } from 'react';

import { ProfileButton, SearchBox, ShellSurface, StartMenuFooter } from '@seojaewan/design-system';

export type StartMenuPanelDevice = 'desktop' | 'mobile';

type StartMenuPanelProps = {
  /** 피그마 Device. 모바일은 좌우 안쪽 여백이 16으로 좁다. 패널 크기와 모서리는 ShellSurface가 정한다 */
  device?: StartMenuPanelDevice;
  /** 위쪽 검색 입력칸(SearchBox `Appearance=Pill`)에 넘길 속성 */
  searchBoxProps?: Omit<ComponentProps<typeof SearchBox>, 'appearance' | 'className'>;
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
 * @codocs [[모바일:차이]]
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
    <ShellSurface material="acrylic" device={device} className={className} style={style}>
      <div className="flex size-full flex-col">
        {/* 피그마 `body` 배치 프레임이다. 위 32와 좌우 여백(모바일 16) 안에 입력칸과 본문을 간격 16으로 쌓는다 */}
        <div
          className={
            isMobile
              ? 'flex min-h-px w-full flex-1 flex-col items-start gap-16 px-16 pt-32'
              : 'flex min-h-px w-full flex-1 flex-col items-start gap-16 px-32 pt-32'
          }
        >
          <SearchBox {...searchBoxProps} appearance="pill" className="w-full shrink-0" />
          <div className="flex min-h-px w-full flex-1 flex-col">{children}</div>
        </div>
        <StartMenuFooter className="w-full shrink-0">
          <div className="flex w-full items-center">
            <ProfileButton photo={profilePhoto} name={profileName} className="min-w-px flex-1" />
            {powerButton}
          </div>
        </StartMenuFooter>
      </div>
    </ShellSurface>
  );
}

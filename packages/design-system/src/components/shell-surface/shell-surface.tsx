import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type ShellSurfaceDevice = 'desktop' | 'mobile';

type ShellSurfaceProps = Omit<ComponentProps<'div'>, 'children'> & {
  device?: ShellSurfaceDevice;
  children?: ReactNode;
};

// 재질 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다. 앱은 아크릴만 쓴다.
const MATERIAL_CLASS_NAME = 'material-acrylic-base surface-shell-acrylic';

// 기기별 크기와 모서리다. 모바일은 화면 아래에 붙어 위쪽 모서리만 둥글다.
const deviceClassNames = {
  desktop: 'h-size-shell-height w-size-shell-width rounded-radius-overlay',
  mobile:
    'h-size-shell-mobile-height w-size-screen-mobile-width rounded-t-radius-overlay rounded-b-radius-none',
} as const satisfies Record<ShellSurfaceDevice, string>;

/**
 * Start와 검색 패널의 셸 바탕(피그마 ShellSurface)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. desktop은 네 모서리가 둥글고, mobile은 아래쪽 모서리가 각진 화면 크기다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.children 피그마 `Content` 슬롯. Start와 검색 조립이 채운다
 */
export function ShellSurface({
  device = 'desktop',
  className,
  children,
  ...divProps
}: ShellSurfaceProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex flex-col items-start border-stroke-width-default border-color-gray-51-40',
        MATERIAL_CLASS_NAME,
        deviceClassNames[device],
        className,
      )}
    >
      <div className="min-h-size-none w-full flex-flex-fill">{children}</div>
    </div>
  );
}

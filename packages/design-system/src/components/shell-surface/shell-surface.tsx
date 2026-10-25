import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type ShellSurfaceMaterial = 'acrylic' | 'solid';

export type ShellSurfaceDevice = 'desktop' | 'mobile';

type ShellSurfaceProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: ShellSurfaceMaterial;
  /** 피그마 Device. desktop은 네 모서리가 둥글고, mobile은 아래쪽 모서리가 각진 화면 크기다 */
  device?: ShellSurfaceDevice;
  /** 피그마 `Content` 슬롯. Start와 검색 조립이 채운다 */
  children?: ReactNode;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-base surface-shell-acrylic',
  solid: 'bg-material-fallback-acrylic-base shadow-elevation-shell-surface',
} as const satisfies Record<ShellSurfaceMaterial, string>;

// 기기별 크기와 모서리다. 모바일은 화면 아래에 붙어 위쪽 모서리만 둥글다.
const deviceClassNames = {
  desktop: 'h-720 w-640 rounded-overlay',
  mobile: 'h-640 w-390 rounded-t-overlay rounded-b-none',
} as const satisfies Record<ShellSurfaceDevice, string>;

/**
 * Start와 검색 패널의 셸 바탕(피그마 ShellSurface)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function ShellSurface(props: ShellSurfaceProps): JSX.Element {
  const { material = 'acrylic', device = 'desktop', className, children, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex flex-col items-start border-default border-surface-stroke-default',
        materialClassNames[material],
        deviceClassNames[device],
        className,
      )}
    >
      <div className="min-h-px w-full flex-1">{children}</div>
    </div>
  );
}

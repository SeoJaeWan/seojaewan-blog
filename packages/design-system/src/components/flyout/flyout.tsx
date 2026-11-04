import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

export type FlyoutMaterial = 'acrylic' | 'solid';

type FlyoutProps = ComponentProps<'div'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: FlyoutMaterial;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-default surface-flyout-acrylic',
  solid: 'bg-material-fallback-acrylic-default shadow-elevation-flyout',
} as const satisfies Record<FlyoutMaterial, string>;

/**
 * 떠 있는 패널의 공통 바탕(피그마 Flyout)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 항목이 바탕 가장자리까지 차도록 위아래 여백만 둔다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Flyout(props: FlyoutProps): JSX.Element {
  const { material = 'acrylic', className, children, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex flex-col items-start justify-start gap-spacing-none rounded-radius-overlay border-stroke-width-default border-color-black-6 px-spacing-none py-spacing-2xs',
        materialClassNames[material],
        className,
      )}
    >
      <div className="flex flex-col self-stretch rounded-radius-control">{children}</div>
    </div>
  );
}

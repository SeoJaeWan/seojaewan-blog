import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';

export type FlyoutMaterial = 'acrylic' | 'solid';

export type FlyoutPadding = 'compact' | 'default';

type FlyoutProps = ComponentProps<'div'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: FlyoutMaterial;
  /** 피그마 Padding. compact는 메뉴처럼 항목이 바탕 가장자리까지 차는 좁은 여백, default는 넓은 여백이다 */
  padding?: FlyoutPadding;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-default surface-flyout-acrylic',
  solid: 'bg-material-fallback-acrylic-default shadow-elevation-flyout',
} as const satisfies Record<FlyoutMaterial, string>;

// 여백별 바탕의 안쪽 여백·간격과 Content 슬롯의 모양이다.
const paddingClassNames = {
  compact: {
    root: 'gap-0 px-0 py-2',
    content: 'flex flex-col self-stretch rounded-control',
  },
  default: {
    root: 'gap-8 p-16',
    content: 'flex flex-col items-center justify-center self-stretch rounded-control px-16 py-24',
  },
} as const satisfies Record<FlyoutPadding, { root: string; content: string }>;

/**
 * 떠 있는 패널의 공통 바탕(피그마 Flyout)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Flyout(props: FlyoutProps): JSX.Element {
  const { material = 'acrylic', padding = 'default', className, children, ...divProps } = props;
  const paddingClassName = paddingClassNames[padding];
  return (
    <div
      {...divProps}
      className={mergeClassNames(
        'relative flex flex-col items-start justify-start rounded-overlay border-default border-surface-stroke-flyout',
        materialClassNames[material],
        paddingClassName.root,
        className,
      )}
    >
      <div className={paddingClassName.content}>{children}</div>
    </div>
  );
}

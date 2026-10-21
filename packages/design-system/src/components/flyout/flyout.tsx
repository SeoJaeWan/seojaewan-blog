import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';

export type FlyoutMaterial = 'acrylic' | 'solid';

type FlyoutProps = ComponentProps<'div'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: FlyoutMaterial;
};

const materialClassNames = {
  acrylic: 'material-acrylic-default shadow-surface-flyout-acrylic',
  solid: 'bg-material-fallback-acrylic-default shadow-elevation-flyout',
} as const satisfies Record<FlyoutMaterial, string>;

/**
 * 떠 있는 패널의 공통 바탕(피그마 Flyout)을 그린다. 내용은 children 자리(피그마 슬롯)에 넣는다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Flyout(props: FlyoutProps): JSX.Element {
  const { material = 'acrylic', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={mergeClassNames(
        'relative isolate flex flex-col gap-8 rounded-overlay border-default border-surface-stroke-flyout p-16',
        materialClassNames[material],
        className,
      )}
    />
  );
}

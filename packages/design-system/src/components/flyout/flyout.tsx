import type { ComponentProps, JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';

export type FlyoutMaterial = 'acrylic' | 'solid';

type FlyoutProps = ComponentProps<'div'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: FlyoutMaterial;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
// material-* 유틸리티는 흐림과 루미너시티 층을 의사 요소로 그려 뒤 배경과 섞으므로, 루트는 쌓임 맥락을
// 만들면 안 된다(isolate, z-index, opacity, transform 등을 두지 않는다).
const materialClassNames = {
  acrylic:
    'material-acrylic-default shadow-surface-flyout-acrylic backdrop-blur-surface-flyout-acrylic',
  solid: 'bg-material-fallback-acrylic-default shadow-elevation-flyout',
} as const satisfies Record<FlyoutMaterial, string>;

/**
 * 떠 있는 패널의 공통 바탕(피그마 Flyout)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * 슬롯은 내용을 담는 자리라 슬롯 자체의 배치만 피그마와 맞춘다(G1).
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Flyout(props: FlyoutProps): JSX.Element {
  const { material = 'acrylic', className, children, ...divProps } = props;
  return (
    <div
      {...divProps}
      // @codocs [[피그마 일치 검사:짝짓기]] 피그마 Flyout 변형 루트와 짝짓는다.
      data-figma-root="Flyout"
      className={mergeClassNames(
        'relative flex w-flyout-width flex-col items-start justify-start rounded-overlay border-default border-surface-stroke-flyout p-16',
        materialClassNames[material],
        className,
      )}
    >
      <div
        data-figma="Content"
        className="flex flex-col items-center justify-center self-stretch px-16 py-24"
      >
        {children}
      </div>
    </div>
  );
}

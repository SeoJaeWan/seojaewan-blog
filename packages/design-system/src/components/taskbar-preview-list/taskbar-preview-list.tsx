import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type TaskbarPreviewListMaterial = 'acrylic' | 'solid';

type TaskbarPreviewListProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: TaskbarPreviewListMaterial;
  /** 피그마 `Previews` 슬롯. 작업 표시줄 창 미리보기 조립이 채운다 */
  children?: ReactNode;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-base surface-shell-acrylic',
  solid: 'bg-material-fallback-acrylic-base shadow-elevation-shell-surface',
} as const satisfies Record<TaskbarPreviewListMaterial, string>;

/**
 * 작업 표시줄 앱 버튼 위에 뜨는 창 미리보기 목록 판(피그마 TaskbarPreviewList)을 그린다.
 * 미리보기는 children 자리(피그마 Previews 슬롯)에 넣고, 크기는 슬롯 내용에 맞춘다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function TaskbarPreviewList(props: TaskbarPreviewListProps): JSX.Element {
  const { material = 'acrylic', className, children, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex items-start gap-4 overflow-clip rounded-overlay border-default border-surface-stroke-default p-4',
        materialClassNames[material],
        className,
      )}
    >
      {children}
    </div>
  );
}

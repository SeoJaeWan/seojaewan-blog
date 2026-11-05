import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type LayerSurfaceProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
};

/**
 * 탐색기 본문처럼 층 바탕과 위쪽 테두리를 가진 카드 바탕(피그마 LayerSurface)을 그린다. 내용은 children 자리(피그마
 * Content 슬롯)에 가로로 놓고, 넘치는 내용은 자른다. 크기는 쓰는 곳이 정한다(피그마 원본 크기는 견본 크기다).
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.children 피그마 `Content` 슬롯. 가로로 놓인다. 탐색기 본문 조립이 탐색 창·나눔선·항목 자리를 채운다
 */
export function LayerSurface({ className, children, ...divProps }: LayerSurfaceProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex overflow-clip border-t-stroke-width-default border-color-black-6 bg-color-white-50',
        className,
      )}
    >
      {children}
    </div>
  );
}

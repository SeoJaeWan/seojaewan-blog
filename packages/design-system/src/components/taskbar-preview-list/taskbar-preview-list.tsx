import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type TaskbarPreviewListProps = Omit<ComponentProps<'div'>, 'children'> & {
  device?: 'desktop' | 'mobile';
  children?: ReactNode;
};

/**
 * 작업 표시줄 앱 버튼 위에 뜨는 창 미리보기 목록 판(피그마 TaskbarPreviewList)을 그린다.
 * 미리보기는 children 자리(피그마 Previews 슬롯)에 넣는다.
 * - Desktop: 카드(WindowPreview Default)를 가로로 늘어놓고, 크기는 슬롯 내용에 맞춘다.
 * - Mobile: 제목 줄(WindowPreview Title)을 세로로 쌓고, 줄이 판 너비를 채운다. 판 너비는 쓰는 곳이 정한다.
 * 판에는 안쪽 여백을 두지 않고 카드를 틈 없이 붙이며, 판 모서리 둥글기는 카드와 같다. 판의 칠·선·효과는 두 기기가 같다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. `mobile`은 미리보기를 세로로 쌓고 판 너비를 채운다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.children 피그마 `Previews` 슬롯. 작업 표시줄 창 미리보기 조립이 채운다
 */
export function TaskbarPreviewList({
  device = 'desktop',
  className,
  children,
  ...divProps
}: TaskbarPreviewListProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex gap-spacing-none overflow-clip rounded-radius-control border-stroke-width-default border-color-gray-51-40 p-spacing-none',
        device === 'mobile' ? 'flex-col items-stretch' : 'items-start',
        // 재질 칠과 효과(피그마 칠·효과 스타일: 그림자와 배경 흐림)다. 앱은 아크릴만 쓴다.
        'material-acrylic-base surface-shell-acrylic',
        className,
      )}
    >
      {children}
    </div>
  );
}

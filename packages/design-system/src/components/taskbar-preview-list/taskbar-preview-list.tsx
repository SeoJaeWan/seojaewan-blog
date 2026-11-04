import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type TaskbarPreviewListProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Previews` 슬롯. 작업 표시줄 창 미리보기 조립이 채운다 */
  children?: ReactNode;
};

/**
 * 작업 표시줄 앱 버튼 위에 뜨는 창 미리보기 목록 판(피그마 TaskbarPreviewList)을 그린다.
 * 미리보기는 children 자리(피그마 Previews 슬롯)에 넣고, 크기는 슬롯 내용에 맞춘다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function TaskbarPreviewList(props: TaskbarPreviewListProps): JSX.Element {
  const { className, children, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex items-start gap-spacing-xs overflow-clip rounded-radius-overlay border-stroke-width-default border-color-gray-51-40 p-spacing-xs',
        // 재질 칠과 효과(피그마 칠·효과 스타일: 그림자와 배경 흐림)다. 앱은 아크릴만 쓴다.
        'material-acrylic-base surface-shell-acrylic',
        className,
      )}
    >
      {children}
    </div>
  );
}

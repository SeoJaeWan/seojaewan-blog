import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SnapPreviewProps = ComponentProps<'div'>;

/**
 * 창이 채울 영역을 미리 보여 주는 반투명 판(피그마 SnapPreview)을 그린다.
 * 크기는 쓰는 곳이 정한다. className으로 너비와 높이(위치)를 준다.
 * 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function SnapPreview(props: SnapPreviewProps): JSX.Element {
  const { className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative rounded-overlay border-default border-surface-stroke-flyout material-acrylic-default surface-flyout-acrylic',
        className,
      )}
    />
  );
}

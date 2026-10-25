import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import {
  SnapLayoutOption,
  type SnapLayoutOptionLayout,
} from '../snap-layout-option/snap-layout-option';

type SnapLayoutFlyoutProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 칸을 골랐을 때. 어느 레이아웃의 몇 번째 칸인지 넘긴다(칸 번호는 SnapLayoutOption과 같다) */
  onSelectZone?: (layout: SnapLayoutOptionLayout, index: number) => void;
};

/**
 * 최대화 버튼에 마우스를 올리면 뜨는 스냅 레이아웃 선택지(피그마 SnapLayoutFlyout)를 그린다.
 * 레이아웃 넷은 SnapLayoutOption 인스턴스로 조립한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 재질은 Flyout과 같은 아크릴이고, 피그마에서 테두리가 레이아웃에 들어가므로 CSS border를 쓴다.
 * @codocs [[디자인 기반:재질 효과]]
 * @param props
 */
export function SnapLayoutFlyout(props: SnapLayoutFlyoutProps): JSX.Element {
  const { onSelectZone: handleSelectZone, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex w-fit items-start gap-12 rounded-overlay border-default border-surface-stroke-flyout p-12',
        'material-acrylic-default surface-flyout-acrylic',
        className,
      )}
    >
      <SnapLayoutOption layout="half" onSelectZone={(index) => handleSelectZone?.('half', index)} />
      <SnapLayoutOption
        layout="twothirds"
        onSelectZone={(index) => handleSelectZone?.('twothirds', index)}
      />
      <SnapLayoutOption
        layout="halfquarter"
        onSelectZone={(index) => handleSelectZone?.('halfquarter', index)}
      />
      <SnapLayoutOption layout="quad" onSelectZone={(index) => handleSelectZone?.('quad', index)} />
    </div>
  );
}

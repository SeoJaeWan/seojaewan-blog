import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { SnapZone } from '../snap-zone/snap-zone';

export type SnapLayoutOptionLayout = 'half' | 'twothirds' | 'halfquarter' | 'quad';

type SnapLayoutOptionProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Layout. 칸을 나누는 방식 */
  layout?: SnapLayoutOptionLayout;
  /** 칸을 골랐을 때. 칸 번호는 왼쪽 열 위에서 아래, 오른쪽 열 위에서 아래 순서의 0부터다(half는 0 왼쪽, 1 오른쪽) */
  onSelectZone?: (index: number) => void;
};

// 칸마다 붙이는 접근성 이름이다(칸 번호 순서). 문서에 이름이 없어 우리가 정했다.
const zoneLabels = {
  half: ['왼쪽 절반', '오른쪽 절반'],
  twothirds: ['왼쪽 3분의 2', '오른쪽 3분의 1'],
  halfquarter: ['왼쪽 절반', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1'],
  quad: ['왼쪽 위 4분의 1', '왼쪽 아래 4분의 1', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1'],
} as const satisfies Record<SnapLayoutOptionLayout, readonly string[]>;

// 레이아웃마다 붙이는 접근성 이름이다. 같은 이름의 칸(예: "왼쪽 절반")이 여러 레이아웃에 있어 칸을 묶음 이름으로 구별한다.
const layoutLabels = {
  half: '반반',
  twothirds: '3분의 2와 3분의 1',
  halfquarter: '절반과 4분의 1 두 칸',
  quad: '4분할',
} as const satisfies Record<SnapLayoutOptionLayout, string>;

// SnapZone은 고정 크기를 가지므로, 열 안에서 남는 자리를 채우도록 크기를 덮어쓴다.
const ZONE_CLASS_NAME = 'h-auto min-h-size-none w-full flex-flex-fill';

/**
 * 스냅 레이아웃 선택지 안의 레이아웃 하나(피그마 SnapLayoutOption)를 그린다. SnapLayoutFlyout에 쓴다.
 * 칸은 SnapZone 인스턴스로 조립한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SnapLayoutOption(props: SnapLayoutOptionProps): JSX.Element {
  const { layout = 'half', onSelectZone: handleSelectZone, className, ...divProps } = props;
  const isTwoThirds = layout === 'twothirds';
  const isLeftSplit = layout === 'quad';
  const isRightSplit = layout === 'halfquarter' || layout === 'quad';
  const labels = zoneLabels[layout];
  /**
   * 칸 번호의 SnapZone 하나를 그린다.
   * @param index 칸 번호
   * @returns 칸
   */
  function renderZone(index: number): JSX.Element {
    return (
      <SnapZone
        label={labels[index] ?? ''}
        onClick={() => handleSelectZone?.(index)}
        className={ZONE_CLASS_NAME}
      />
    );
  }
  const rightStart = isLeftSplit ? 2 : 1;
  return (
    <div
      role="group"
      aria-label={layoutLabels[layout]}
      {...divProps}
      className={cn(
        'flex h-size-snap-option-height w-size-snap-option-width gap-spacing-xs overflow-clip',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-full min-w-size-none flex-col gap-spacing-xs overflow-clip',
          isTwoThirds ? 'w-size-snap-option-column-width shrink-shrink-none' : 'flex-flex-fill',
        )}
      >
        {isLeftSplit ? (
          <>
            {renderZone(0)}
            {renderZone(1)}
          </>
        ) : (
          renderZone(0)
        )}
      </div>
      <div className="flex h-full min-w-size-none flex-flex-fill flex-col gap-spacing-xs overflow-clip">
        {isRightSplit ? (
          <>
            {renderZone(rightStart)}
            {renderZone(rightStart + 1)}
          </>
        ) : (
          renderZone(rightStart)
        )}
      </div>
    </div>
  );
}

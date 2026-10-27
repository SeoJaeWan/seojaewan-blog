import type { ComponentProps, CSSProperties, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type ScrollbarOrientation = 'vertical' | 'horizontal';

export type ScrollbarState = 'rest' | 'expanded';

export type ScrollbarMaterial = 'acrylic' | 'solid';

type ScrollbarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Orientation. vertical은 세로 막대, horizontal은 가로 막대다 */
  orientation?: ScrollbarOrientation;
  /** 피그마 State. rest는 얇은 막대만, expanded는 바탕과 양 끝 화살표를 함께 그리고 막대가 두꺼워진다 */
  state?: ScrollbarState;
  /** 피그마 Material(State=Expanded의 바탕). acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: ScrollbarMaterial;
  /** 막대(thumb)가 트랙 시작에서 떨어진 거리(px). 쓰는 곳(ScrollArea)이 실행 중에 정한다. 없으면 피그마 기본값 40이다 */
  thumbOffset?: number;
  /** 막대(thumb) 길이(px). 쓰는 곳(ScrollArea)이 실행 중에 정한다. 없으면 피그마 기본값 80이다 */
  thumbLength?: number;
};

/**
 * 얇은 스크롤 막대(피그마 Scrollbar)를 그린다. ScrollArea 안에서 넘치는 내용의 위치를 보여 줄 때 쓴다.
 * 막대의 위치와 길이는 쓰는 곳이 실행 중에 정한다(@codocs [[디자인 기반:겹쳐 놓기]]).
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Scrollbar(props: ScrollbarProps): JSX.Element {
  const {
    orientation = 'vertical',
    state = 'rest',
    material = 'acrylic',
    thumbOffset,
    thumbLength,
    className,
    ...divProps
  } = props;
  const isVertical = orientation === 'vertical';
  const isExpanded = state === 'expanded';
  const thumbStyle: CSSProperties = isVertical
    ? { top: thumbOffset, height: thumbLength }
    : { left: thumbOffset, width: thumbLength };
  return (
    <div
      {...divProps}
      className={cn(
        // 길이 방향 크기는 쓰는 곳(ScrollArea)이 정하므로 루트는 두께(size/12)만 가진다.
        'relative flex shrink-0 items-center justify-between gap-0 p-2',
        isVertical ? 'w-12 flex-col' : 'h-12 flex-row',
        // State=Expanded 바탕의 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일 Material/Acrylic)다. 그림자는 없다.
        isExpanded && 'rounded-circular',
        isExpanded &&
          (material === 'acrylic'
            ? 'material-acrylic-default'
            : 'bg-material-fallback-acrylic-default'),
        className,
      )}
    >
      {/* 화살표는 아래쪽 쉐브론 자산을 돌려 쓴다. 피그마 회전은 반시계가 양수라 CSS와 부호가 반대다(@codocs [[피그마 연동:회전 구현]]). */}
      {isExpanded && (
        <Asset
          name="icons/ic_fluent_chevron_down_16_regular.svg"
          className={cn(
            'size-8 shrink-0 text-control-strong-fill-default',
            isVertical ? 'rotate-180' : 'rotate-90',
          )}
        />
      )}
      {/* 막대는 가운데 정렬한 절대 위치 자식이다. 위치·길이의 피그마 기본값은 시작에서 40, 길이 80이다. */}
      <div
        className={cn(
          'absolute rounded-circular bg-control-strong-fill-default',
          isVertical
            ? 'top-40 left-1/2 h-80 -translate-x-1/2'
            : 'top-1/2 left-40 w-80 -translate-y-1/2',
          isVertical && (isExpanded ? 'w-6' : 'w-2'),
          !isVertical && (isExpanded ? 'h-6' : 'h-2'),
        )}
        style={thumbStyle}
      />
      {isExpanded && (
        <Asset
          name="icons/ic_fluent_chevron_down_16_regular.svg"
          className={cn(
            'size-8 shrink-0 text-control-strong-fill-default',
            !isVertical && '-rotate-90',
          )}
        />
      )}
    </div>
  );
}

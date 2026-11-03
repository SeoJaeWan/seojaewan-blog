import type { ComponentProps, CSSProperties, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type ScrollbarState = 'rest' | 'expanded';

export type ScrollbarMaterial = 'acrylic' | 'solid';

type ScrollbarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 State. rest는 얇은 막대만, expanded는 바탕과 양 끝 화살표를 함께 그리고 막대가 두꺼워진다 */
  state?: ScrollbarState;
  /** 피그마 Material(State=Expanded의 바탕). acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: ScrollbarMaterial;
  /** 막대(thumb)가 트랙 위쪽에서 떨어진 거리(px). 쓰는 곳(ScrollArea)이 실행 중에 정한다. 없으면 피그마 기본값 40이다 */
  thumbOffset?: number;
  /** 막대(thumb) 길이(px). 쓰는 곳(ScrollArea)이 실행 중에 정한다. 없으면 피그마 기본값 80이다 */
  thumbLength?: number;
};

/**
 * 얇은 세로 스크롤 막대(피그마 Scrollbar)를 그린다. ScrollArea 안에서 넘치는 내용의 위치를 보여 줄 때 쓴다.
 * 막대의 위치와 길이는 쓰는 곳이 실행 중에 정한다(@codocs [[디자인 기반:겹쳐 놓기]]).
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Scrollbar(props: ScrollbarProps): JSX.Element {
  const {
    state = 'rest',
    material = 'acrylic',
    thumbOffset,
    thumbLength,
    className,
    ...divProps
  } = props;
  const isExpanded = state === 'expanded';
  const thumbStyle: CSSProperties = { top: thumbOffset, height: thumbLength };
  return (
    <div
      data-state={state}
      {...divProps}
      className={cn(
        // 길이 방향 크기는 쓰는 곳(ScrollArea)이 정하므로 루트는 두께(size/12)만 가진다.
        'relative flex w-size-scrollbar-thickness shrink-shrink-none flex-col items-center justify-between gap-spacing-none p-spacing-2xs',
        // State=Expanded 바탕의 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일 Material/Acrylic)다. 그림자는 없다.
        isExpanded && 'rounded-radius-circular',
        isExpanded &&
          (material === 'acrylic'
            ? 'material-acrylic-default'
            : 'bg-material-fallback-acrylic-default'),
        className,
      )}
    >
      {/* 위쪽 화살표는 아래쪽 쉐브론 자산을 반 바퀴 돌려 쓴다(@codocs [[피그마 연동:회전 구현]]). */}
      {isExpanded && (
        <Asset
          name="icons/ic_fluent_chevron_down_16_regular.svg"
          className="size-size-icon-2xs shrink-shrink-none rotate-rotate-half text-control-strong-fill-default"
        />
      )}
      {/* 막대는 가운데 정렬한 절대 위치 자식이다. 위치·길이의 피그마 기본값은 위에서 40, 길이 80이다. */}
      <div
        className={cn(
          'absolute top-spacing-4xl left-position-half h-size-scrollbar-thumb-length -translate-x-position-half rounded-radius-circular bg-control-strong-fill-default',
          isExpanded ? 'w-size-scrollbar-thumb-hover' : 'w-size-scrollbar-thumb-rest',
        )}
        style={thumbStyle}
      />
      {isExpanded && (
        <Asset
          name="icons/ic_fluent_chevron_down_16_regular.svg"
          className="size-size-icon-2xs shrink-shrink-none text-control-strong-fill-default"
        />
      )}
    </div>
  );
}

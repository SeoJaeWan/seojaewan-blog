import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type TooltipType = 'default' | 'balloon';

export type TooltipMaterial = 'acrylic' | 'solid';

type TooltipProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Type. default는 글자만 담는 작은 말풍선, balloon은 위쪽 꼬리와 경고 아이콘이 있는 너비 300의 단색 말풍선이다 */
  type?: TooltipType;
  /** 피그마 Material(Type=Default만). acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: TooltipMaterial;
  /** 말풍선 글자(피그마 Text, Type=Default만) */
  text?: string;
  /** 경고 아이콘 옆 글자(피그마 Message, Type=Balloon만) */
  message?: string;
};

// 바탕 테두리와 모서리다. 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
const SURFACE_CLASS_NAME = 'rounded-control border-default border-surface-stroke-flyout';

// Type=Default의 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 그림자와 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-default surface-tooltip-acrylic',
  solid: 'bg-material-fallback-acrylic-default shadow-elevation-tooltip',
} as const satisfies Record<TooltipMaterial, string>;

/**
 * 짧은 안내 말풍선(피그마 Tooltip)을 그린다. 띄우는 위치는 쓰는 곳(Popover)이 정한다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function Tooltip(props: TooltipProps): JSX.Element {
  const { type = 'default', material = 'acrylic', text, message, className, ...divProps } = props;
  if (type === 'balloon') {
    // 바깥 틀은 피그마 변형 노드의 자리와 그림자(효과 스타일)를 가진다. 꼬리(피그마 Shapes 자산 tooltip/Tail fill·Tail border)는
    // 노드 테두리 상자 기준 (16, -8)에 겹쳐 두고, 칠 자산이 바탕의 위 테두리를 덮는다. 테두리가 있는 바탕 안에 두면
    // 위치 기준이 테두리 안쪽으로 1px 들어가므로 바탕과 나눈다.
    return (
      <div
        role="tooltip"
        {...divProps}
        className={cn('relative w-300 rounded-control shadow-elevation-tooltip', className)}
      >
        <div
          className={cn(
            'flex flex-col gap-4 bg-solid-background-fill-quarternary p-12',
            SURFACE_CLASS_NAME,
          )}
        >
          <div className="flex items-start gap-8 self-stretch overflow-hidden">
            <Asset
              name="icons/ic_fluent_warning_24_regular.svg"
              className="size-icon-16 shrink-0 text-system-fill-caution"
            />
            <span className="min-w-0 flex-1 type-caption text-text-fill-primary">{message}</span>
          </div>
        </div>
        <Asset
          name="shapes/tooltip-tail-fill.svg"
          className="absolute -top-8 left-16 h-9 w-14 text-solid-background-fill-quarternary"
        />
        <Asset
          name="shapes/tooltip-tail-border.svg"
          className="absolute -top-8 left-16 h-9 w-14 text-surface-stroke-flyout"
        />
      </div>
    );
  }
  return (
    <div
      role="tooltip"
      {...divProps}
      className={cn(
        'inline-flex max-w-318 flex-col px-8 py-6 type-caption text-text-fill-primary',
        SURFACE_CLASS_NAME,
        materialClassNames[material],
        className,
      )}
    >
      {text}
    </div>
  );
}

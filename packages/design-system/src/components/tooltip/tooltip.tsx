import type { ComponentProps, JSX } from 'react';

import type { SvgAssetName } from '../../assets/asset-data';
import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type TooltipType = 'default' | 'balloon';

export type TooltipMaterial = 'acrylic' | 'solid';

type TooltipProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 말풍선 글자(피그마 텍스트 속성) */
  text: string;
  /** 피그마 Type. default는 글자 한 줄만 담는 작은 말풍선, balloon은 위쪽 꼬리와 아이콘이 있는 너비 300의 말풍선이다 */
  type?: TooltipType;
  /** 피그마 Material(Type=Default만). acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다. balloon은 단색만 있다 */
  material?: TooltipMaterial;
  /** 글자 앞 16px 아이콘(피그마 Icon, Type=Balloon만) */
  icon?: SvgAssetName;
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
  const {
    text,
    type = 'default',
    material = 'acrylic',
    icon = 'icons/ic_fluent_warning_24_regular.svg',
    className,
    ...divProps
  } = props;
  if (type === 'balloon') {
    // 꼬리(피그마 Shapes 자산 tooltip/Tail fill·Tail border)는 바탕 위 8px 자리에 두고, 칠 자산이 바탕의 위 테두리를 덮는다.
    return (
      <div
        role="tooltip"
        {...divProps}
        className={cn('relative flex w-300 flex-col pt-8', className)}
      >
        <div
          className={cn(
            'flex items-center gap-8 self-stretch bg-solid-background-fill-quarternary p-12 shadow-elevation-tooltip',
            SURFACE_CLASS_NAME,
          )}
        >
          <Asset name={icon} className="size-icon-16 shrink-0 text-system-fill-caution" />
          <span className="min-w-0 flex-1 type-caption text-text-fill-primary">{text}</span>
        </div>
        <div className="absolute top-0 left-16 h-9 w-14">
          <Asset
            name="shapes/tooltip-tail-fill.svg"
            className="absolute top-0 left-0 h-9 w-14 text-solid-background-fill-quarternary"
          />
          <Asset
            name="shapes/tooltip-tail-border.svg"
            className="absolute top-0 left-0 h-9 w-14 text-surface-stroke-flyout"
          />
        </div>
      </div>
    );
  }
  return (
    <div
      role="tooltip"
      {...divProps}
      className={cn(
        'inline-flex px-8 py-6 whitespace-nowrap type-caption text-text-fill-primary',
        SURFACE_CLASS_NAME,
        materialClassNames[material],
        className,
      )}
    >
      {text}
    </div>
  );
}

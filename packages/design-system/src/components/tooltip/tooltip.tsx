import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type TooltipVariant = 'default' | 'balloon';

type TooltipProps = Omit<ComponentProps<'div'>, 'children'> & {
  variant?: TooltipVariant;
  text?: string;
  message?: string;
};

// 바탕 테두리와 모서리다. 피그마에서 테두리가 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
const SURFACE_CLASS_NAME =
  'rounded-radius-control border-stroke-width-default border-color-black-6';

/**
 * 짧은 안내 말풍선(피그마 Tooltip)을 그린다. 띄우는 위치는 쓰는 곳(Popover)이 정한다.
 * 스스로 뜨는 오류 안내는 쓰는 곳이 `role="alert"`를 넘겨 스크린 리더가 바로 읽게 한다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props 컴포넌트 속성
 * @param props.variant 피그마 Variant. default는 글자만 담는 작은 아크릴 말풍선, balloon은 위쪽 꼬리와 경고 아이콘이 있는
 *   너비 300의 단색 말풍선이다. 재질은 Variant마다 하나로 정해져 있다
 * @param props.text 말풍선 글자(피그마 Text, Variant=Default만)
 * @param props.message 경고 아이콘 옆 글자(피그마 Message, Variant=Balloon만)
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Tooltip({
  variant = 'default',
  text,
  message,
  className,
  ...divProps
}: TooltipProps): JSX.Element {
  if (variant === 'balloon') {
    // 바깥 틀은 피그마 변형 노드의 자리와 그림자(효과 스타일)를 가진다. 꼬리(피그마 Shapes 자산 tooltip/Tail fill·Tail border)는
    // 노드 테두리 상자 기준 (16, -8)에 겹쳐 두고, 칠 자산이 바탕의 위 테두리를 덮는다. 테두리가 있는 바탕 안에 두면
    // 위치 기준이 테두리 안쪽으로 1px 들어가므로 바탕과 나눈다.
    return (
      <div
        role="tooltip"
        {...divProps}
        className={cn(
          'relative w-size-tooltip-balloon-width rounded-radius-control shadow-elevation-tooltip',
          className,
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-spacing-xs bg-color-white p-spacing-md',
            SURFACE_CLASS_NAME,
          )}
        >
          <div className="flex items-start gap-spacing-sm self-stretch overflow-hidden">
            <Asset
              name="icons/ic_fluent_warning_24_regular.svg"
              className="size-size-icon-sm shrink-shrink-none text-color-yellow-54"
            />
            <span className="min-w-size-none flex-flex-fill type-caption text-color-black-89">
              {message}
            </span>
          </div>
        </div>
        <Asset
          name="shapes/tooltip-tail-fill.svg"
          className="absolute -top-spacing-sm left-spacing-lg h-size-tooltip-tail-height w-size-tooltip-tail-width text-color-white"
        />
        <Asset
          name="shapes/tooltip-tail-border.svg"
          className="absolute -top-spacing-sm left-spacing-lg h-size-tooltip-tail-height w-size-tooltip-tail-width text-color-black-6"
        />
      </div>
    );
  }
  return (
    <div
      role="tooltip"
      {...divProps}
      className={cn(
        'inline-flex max-w-size-tooltip-max-width flex-col px-spacing-sm py-spacing-sm-nudge type-caption text-color-black-89',
        SURFACE_CLASS_NAME,
        // 피그마 칠 스타일 Material/Acrylic Default와 효과 스타일 Surface/Tooltip (Acrylic)이다.
        'material-acrylic-default surface-tooltip-acrylic',
        className,
      )}
    >
      {text}
    </div>
  );
}

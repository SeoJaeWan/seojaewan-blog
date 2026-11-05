import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type PinnedTileProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  icon: ReactNode;
  label?: string;
  className?: string;
};

/**
 * 아이콘과 이름으로 된 고정 항목 칸(피그마 PinnedTile)을 그린다. 동작과 접근성은 Base UI Button이 맡는다.
 * 크기는 Windows가 정한 95×84로 고정한다. Rest·Hover·Pressed는 CSS hover·active로 바꾼다.
 * 테두리는 안쪽 선 고리로 그려 자리를 차지하지 않는다. 글자 폭이 피그마와 같은 87px로 늘 같아, 상태가 바뀌어도
 * 아이콘과 글자가 움직이지 않고 글자가 먼저 잘리지도 않는다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props 컴포넌트 속성
 * @param props.icon 피그마 인스턴스 교체 속성 Item icon. 쓰는 곳마다 다른 앱·파일·폴더 아이콘이라 꼭 넘긴다. 32px 자리에 맞춰 그린다
 * @param props.label 피그마 TEXT 속성 Label. 아이콘 아래에 보일 이름이다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function PinnedTile({
  icon,
  label = '앱 이름',
  className,
  ...buttonProps
}: PinnedTileProps): JSX.Element {
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'relative inline-flex h-size-pinned-tile-height w-size-pinned-tile-width flex-col items-center justify-center gap-spacing-sm rounded-radius-control px-spacing-xs py-spacing-sm select-none inner-border-w-stroke-width-default',
        'motion-control-state',
        'bg-color-white-0',
        'hover:bg-color-gray-3-50 hover:not-active:inner-border-color-black-6',
        'active:bg-color-gray-2-30',
        className,
      )}
    >
      <span className="inline-flex size-size-icon-xl shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
        {icon}
      </span>
      <span className="w-full shrink-shrink-none truncate text-center type-caption text-color-black-89">
        {label}
      </span>
    </BaseButton>
  );
}

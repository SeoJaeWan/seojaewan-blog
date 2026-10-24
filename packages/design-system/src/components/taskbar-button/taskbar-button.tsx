import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type TaskbarButtonIndicator = 'none' | 'running' | 'active';

// 앱 아이콘 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const appIcon = new URL('../../assets/images/app-file-explorer.png', import.meta.url).href;

type TaskbarButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Indicator. none은 표시 없음, running은 실행 중인 앱, active는 지금 고른 앱이다 */
  indicator?: TaskbarButtonIndicator;
  /** 피그마 인스턴스 교체 속성 icon. 비우면 앱 아이콘을 그린다. 24px(누르는 중 20px) 자리에 맞춰 그린다 */
  icon?: ReactNode;
  /** 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다 */
  label: string;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// Active는 Rest부터 바탕이 깔려 있고, 나머지는 마우스를 올리거나 누를 때만 깔린다. 누르는 중에는 더 옅다.
// 테두리 자리는 항상 두어 상태가 바뀌어도 아이콘과 표시줄이 움직이지 않게 한다.
const surfaceClassNames = {
  none: 'bg-subtle-fill-transparent',
  running: 'bg-subtle-fill-transparent',
  active: 'bg-control-fill-default',
} as const satisfies Record<TaskbarButtonIndicator, string>;

const indicatorClassNames = {
  running: 'w-6 bg-control-strong-fill-default',
  active: 'w-16 bg-accent-fill-default',
} as const satisfies Record<Exclude<TaskbarButtonIndicator, 'none'>, string>;

/**
 * 작업 표시줄의 앱 버튼 하나(피그마 TaskbarButton)를 그린다. 동작과 접근성은 Base UI Button이 맡는다.
 * 크기는 Windows가 정한 40×40으로 고정한다. Rest·Hover·Pressed는 CSS hover·active로 바꾼다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function TaskbarButton(props: TaskbarButtonProps): JSX.Element {
  const { indicator = 'none', icon, label, className, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      className={cn(
        'group relative inline-flex size-40 items-center justify-center rounded-control border-default select-none',
        'transition-colors duration-faster ease-fade',
        'border-transparent hover:border-control-stroke-default active:border-control-stroke-default',
        surfaceClassNames[indicator],
        indicator === 'active' && 'border-control-stroke-default',
        'hover:bg-control-fill-default active:bg-control-fill-tertiary',
        className,
      )}
    >
      <span className="inline-flex size-24 items-center justify-center group-active:size-20">
        {icon ?? <img src={appIcon} alt="" className="size-full object-contain" />}
      </span>
      {indicator === 'none' ? null : (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -bottom-px left-1/2 h-stroke-indicator -translate-x-1/2 rounded-circular',
            indicatorClassNames[indicator],
          )}
        />
      )}
    </BaseButton>
  );
}

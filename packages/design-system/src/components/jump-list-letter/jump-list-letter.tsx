import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type JumpListLetterProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Label. 칸에 보이는 글자이자 접근성 이름이다 */
  label: string;
  /** 덧붙이거나 덮어쓸 클래스 */
  className?: string;
};

// 색은 Button의 Subtle과 같다. 상태 색은 실제 CSS 상태(hover, active, focus-visible, disabled)로 바꾼다.
// 키보드 포커스는 Button처럼 피그마 바깥 선을 outline으로 그린다.
const stateClassNames = [
  'bg-subtle-fill-transparent text-text-fill-primary',
  'hover:not-data-disabled:bg-subtle-fill-secondary',
  'active:not-data-disabled:bg-subtle-fill-tertiary active:not-data-disabled:text-text-fill-secondary',
  'data-disabled:bg-subtle-fill-disabled data-disabled:text-text-fill-disabled',
];

/**
 * Start 모두 목록의 글자 격자에서 이동할 글자 하나를 고르는 칸(피그마 JumpListLetter)을 그린다.
 * 동작과 접근성(disabled, 포커스)은 Base UI Button이 맡는다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function JumpListLetter(props: JumpListLetterProps): JSX.Element {
  const { label, className, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'inline-flex size-40 items-center justify-center rounded-control select-none',
        'focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid',
        'motion-control-state',
        ...stateClassNames,
        className,
      )}
    >
      <span className="type-body">{label}</span>
    </BaseButton>
  );
}

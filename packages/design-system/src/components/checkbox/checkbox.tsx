import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type CheckboxProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Checked. 체크 표시가 있는지 정한다 */
  checked?: boolean;
};

/**
 * 글 본문 할 일 목록의 읽기 전용 체크 표시(피그마 Checkbox)를 그린다.
 * 눌러 바꾸는 입력이 아니라 글에 적힌 상태만 보여 주므로 `onChange`를 받지 않는다.
 * @codocs [[Chrome:Notion 블록]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function Checkbox(props: CheckboxProps): JSX.Element {
  const { checked: isChecked = false, className, ...divProps } = props;
  return (
    <div
      role="checkbox"
      aria-checked={isChecked}
      aria-readonly
      {...divProps}
      className={cn(
        'flex size-20 shrink-0 items-center justify-center rounded-control',
        isChecked
          ? 'bg-accent-fill-default'
          : 'border-default border-control-strong-stroke-default bg-control-alt-fill-secondary',
        className,
      )}
    >
      {isChecked ? (
        <Asset
          name="icons/ic_fluent_checkmark_20_regular.svg"
          className="size-icon-16 shrink-0 text-text-on-accent-fill-primary"
        />
      ) : null}
    </div>
  );
}

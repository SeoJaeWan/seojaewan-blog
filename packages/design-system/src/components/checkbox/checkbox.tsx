import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type CheckboxProps = Omit<ComponentProps<'div'>, 'children'> & {
  isChecked?: boolean;
  label: string;
};

/**
 * 글 본문 할 일 목록의 읽기 전용 체크 표시(피그마 Checkbox)를 그린다.
 * 눌러 바꾸는 입력이 아니라 글에 적힌 상태만 보여 주므로 `onChange`를 받지 않는다.
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.isChecked 피그마 Checked. 체크 표시가 있는지 정한다
 * @param props.label 접근성 이름. 할 일 글자처럼 무엇을 표시하는지 적는다. 그려지지 않는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Checkbox({
  isChecked = false,
  label,
  className,
  ...divProps
}: CheckboxProps): JSX.Element {
  return (
    <div
      role="checkbox"
      aria-label={label}
      aria-checked={isChecked}
      aria-readonly
      {...divProps}
      className={cn(
        'flex size-size-checkbox-box shrink-shrink-none items-center justify-center rounded-radius-control',
        isChecked
          ? 'bg-color-blue-59'
          : 'border-stroke-width-default border-color-black-61 bg-color-black-2',
        className,
      )}
    >
      {isChecked ? (
        <Asset
          name="icons/ic_fluent_checkmark_20_regular.svg"
          className="size-size-icon-sm shrink-shrink-none text-color-white"
        />
      ) : null}
    </div>
  );
}

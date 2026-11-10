import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BreadcrumbChevronProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  label: string;
  isOpen?: boolean;
  className?: string;
};

/**
 * 경로 마디 사이의 꺾쇠 버튼(피그마 BreadcrumbChevron)을 그린다. BreadcrumbItem의 구분자 자리에 쓴다.
 * 버튼 모양과 상태만 맡고, 여는 메뉴(하위 폴더 목록)는 쓰는 곳이 메뉴 트리거로 감싸 붙인다.
 * 받은 속성을 Base UI Button에 그대로 넘기므로 Base UI `Menu.Trigger`의 `render`로 쓸 수 있다.
 * Hover는 실제 CSS hover로 그리고, 열린 동안(`isOpen`)은 아래 꺾쇠(⌄)와 눌린 바탕이다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props 컴포넌트 속성
 * @param props.label 접근성 이름. 글자가 없는 버튼이라 aria-label로 붙인다
 * @param props.isOpen 피그마 `State=Open`. 이 버튼이 연 메뉴가 열려 있는지다. 쓰는 곳의 메뉴 열림 상태를 그대로 넘긴다
 * @param props.className 바깥 배치(여백, 위치)에만 쓰는 클래스
 */
export function BreadcrumbChevron({
  label,
  isOpen = false,
  className,
  ...buttonProps
}: BreadcrumbChevronProps): JSX.Element {
  return (
    <BaseButton
      {...buttonProps}
      aria-label={label}
      // 열림 모양을 상태 속성으로 알린다.
      data-open={isOpen}
      className={cn(
        'inline-flex items-center justify-center rounded-radius-control p-spacing-xs text-color-black-61 select-none',
        isOpen ? 'bg-color-black-2' : 'bg-color-white-0 hover:bg-color-black-4',
        'motion-control-state',
        className,
      )}
    >
      <Asset
        name={
          isOpen
            ? 'icons/ic_fluent_chevron_down_16_regular.svg'
            : 'icons/ic_fluent_chevron_right_16_regular.svg'
        }
        className="size-size-icon-sm"
      />
    </BaseButton>
  );
}

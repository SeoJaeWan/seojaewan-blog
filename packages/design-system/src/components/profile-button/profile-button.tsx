import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ProfileButtonProps = Omit<ComponentProps<'button'>, 'children' | 'name'> & {
  photo: ReactNode;
  name?: string;
};

/**
 * 사용자 사진과 이름으로 된 버튼(피그마 ProfileButton)을 그린다. Start 메뉴 아래 줄에 쓴다.
 * 크기는 사진 32와 이름 글자 너비가 정한다(내용에 맞춤).
 * 누를 수 있다는 것은 커서가 아니라 호버 배경으로 알린다(피그마 State=Hover, 실제 CSS 상태로 그린다).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:커서]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.photo 피그마 INSTANCE_SWAP 속성 Photo. 32×32 프로필 사진이다. 쓰는 곳마다 다르므로 필수다
 * @param props.name 피그마 TEXT 속성 Name. 사용자 이름 글자다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.type 버튼 type. 기본은 `button`이다
 */
export function ProfileButton({
  photo,
  name = '사용자 이름',
  className,
  type = 'button',
  ...buttonProps
}: ProfileButtonProps): JSX.Element {
  return (
    <button
      {...buttonProps}
      type={type}
      className={cn(
        'flex items-center gap-spacing-md rounded-radius-control text-left select-none',
        'bg-color-white-0 motion-control-state hover:bg-color-black-4',
        className,
      )}
    >
      <span className="flex size-size-avatar-profile shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
        {photo}
      </span>
      <span className="type-body whitespace-nowrap text-color-black-89">{name}</span>
    </button>
  );
}

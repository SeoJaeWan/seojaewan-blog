import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ProfileButtonProps = Omit<ComponentProps<'button'>, 'children' | 'name'> & {
  /** 피그마 INSTANCE_SWAP 속성 Photo. 32×32 프로필 사진이다. 쓰는 곳마다 다르므로 필수다 */
  photo: ReactNode;
  /** 피그마 TEXT 속성 Name. 사용자 이름 글자다 */
  name?: string;
};

/**
 * 사용자 사진과 이름으로 된 버튼(피그마 ProfileButton)을 그린다. Start 메뉴 아래 줄에 쓴다.
 * 크기는 사진 32와 이름 글자 너비가 정한다(내용에 맞춤).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function ProfileButton(props: ProfileButtonProps): JSX.Element {
  const { photo, name = '사용자 이름', className, type = 'button', ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      className={cn('flex items-center gap-12 text-left select-none', className)}
    >
      <span className="flex size-32 shrink-0 items-center justify-center">{photo}</span>
      <span className="type-body whitespace-nowrap text-text-fill-primary">{name}</span>
    </button>
  );
}

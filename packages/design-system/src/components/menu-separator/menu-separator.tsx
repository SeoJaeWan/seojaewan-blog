import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Separator } from '../separator/separator';

type MenuSeparatorProps = Omit<ComponentProps<'div'>, 'children'>;

/**
 * 메뉴 항목 사이의 구분선(피그마 MenuSeparator)을 그린다. 위 2·아래 6 여백 안에 가로 Separator가 너비를 채운다.
 * 너비는 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function MenuSeparator(props: MenuSeparatorProps): JSX.Element {
  const { className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn('flex flex-col pt-spacing-2xs pb-spacing-sm-nudge', className)}
    >
      <Separator className="w-full" />
    </div>
  );
}

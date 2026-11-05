import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type StartMenuFooterProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
};

/**
 * Start 메뉴 맨 아래 줄의 바탕(피그마 StartMenuFooter)을 그린다.
 * 너비는 쓰는 곳이 정하고, 높이는 `children` 슬롯의 내용이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props 컴포넌트 속성
 * @param props.children 피그마 `Content` 슬롯. 프로필과 전원 버튼을 넣는다. 가로로 늘어놓고 세로 가운데에 맞춘다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function StartMenuFooter({
  children,
  className,
  ...divProps
}: StartMenuFooterProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center overflow-clip border-t-stroke-width-default border-color-black-6 bg-color-black-4 px-spacing-5xl py-spacing-lg',
        className,
      )}
    >
      <div className="flex min-w-size-none flex-flex-fill items-center">{children}</div>
    </div>
  );
}

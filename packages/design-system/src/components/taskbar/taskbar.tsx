import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type TaskbarProps = Omit<ComponentProps<'div'>, 'children'> & {
  center?: ReactNode;
  right?: ReactNode;
};

/**
 * 화면 아래 작업 표시줄(피그마 Taskbar)의 재질 바탕과 자리를 그린다.
 * 가운데(center)와 오른쪽(right) 자리만 열고, 시작 버튼·검색·앱 버튼·SystemTray는 조립(Taskbar/Default)이 채운다.
 * 자리가 둘이라 children 하나가 아닌 이름 있는 ReactNode prop으로 연다.
 * 높이는 Windows가 정한 48로 고정하고, 너비는 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.center 피그마 Center 슬롯. 시작 버튼·검색·앱 버튼을 넣는다
 * @param props.right 피그마 Right 슬롯. SystemTray를 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Taskbar({ center, right, className, ...divProps }: TaskbarProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex h-size-taskbar-height items-center px-spacing-md',
        // 재질 칠이다(피그마 칠 스타일). 앱은 아크릴만 쓴다.
        'material-acrylic-base',
        className,
      )}
    >
      {/* 위쪽 선이다. 피그마 안쪽 선은 레이아웃에 들어가지 않아, CSS border로 그리면 내용이 0.5px 내려간다. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-spacing-none top-spacing-none h-stroke-stroke-width-default bg-color-black-6"
      />
      {/* 피그마 left space다. Right와 같은 너비를 차지해 Center를 가운데에 둔다. */}
      <div aria-hidden className="h-full min-w-size-none flex-flex-fill" />
      <div className="flex h-size-taskbar-item shrink-shrink-none items-center gap-spacing-xs">
        {center}
      </div>
      <div className="flex h-full min-w-size-none flex-flex-fill items-center justify-end overflow-hidden">
        {right}
      </div>
    </div>
  );
}

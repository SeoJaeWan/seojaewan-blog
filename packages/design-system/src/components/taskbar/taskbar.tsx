import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type TaskbarMaterial = 'acrylic' | 'solid';

type TaskbarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: TaskbarMaterial;
  /** 피그마 Center 슬롯. 시작 버튼·검색·앱 버튼을 넣는다 */
  center?: ReactNode;
  /** 피그마 Right 슬롯. SystemTray를 넣는다 */
  right?: ReactNode;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-base',
  solid: 'bg-material-fallback-acrylic-base',
} as const satisfies Record<TaskbarMaterial, string>;

/**
 * 화면 아래 작업 표시줄(피그마 Taskbar)의 재질 바탕과 자리를 그린다.
 * 가운데(center)와 오른쪽(right) 자리만 열고, 시작 버튼·검색·앱 버튼·SystemTray는 조립(Taskbar/Default)이 채운다.
 * 자리가 둘이라 children 하나가 아닌 이름 있는 ReactNode prop으로 연다.
 * 높이는 Windows가 정한 48로 고정하고, 너비는 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function Taskbar(props: TaskbarProps): JSX.Element {
  const { material = 'acrylic', center, right, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex h-48 items-center px-12',
        materialClassNames[material],
        className,
      )}
    >
      {/* 위쪽 선이다. 피그마 안쪽 선은 레이아웃에 들어가지 않아, CSS border로 그리면 내용이 0.5px 내려간다. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-stroke-default bg-card-stroke-default"
      />
      {/* 피그마 left space다. Right와 같은 너비를 차지해 Center를 가운데에 둔다. */}
      <div aria-hidden className="h-full min-w-0 flex-1" />
      <div className="flex h-40 shrink-0 items-center gap-4">{center}</div>
      <div className="flex h-full min-w-0 flex-1 items-center justify-end overflow-hidden">
        {right}
      </div>
    </div>
  );
}

import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { SearchBox } from '../search-box/search-box';
import { SystemTray } from '../system-tray/system-tray';
import { TaskbarButton } from '../taskbar-button/taskbar-button';

export type TaskbarSearch = 'box' | 'button';

export type TaskbarMaterial = 'acrylic' | 'solid';

type TaskbarProps = ComponentProps<'div'> & {
  /** 피그마 Search. box는 Start 옆 검색 상자, button은 돋보기 버튼이다 */
  search?: TaskbarSearch;
  /** 피그마 Material. acrylic은 뒤가 흐리게 비치는 재질, solid는 재질 효과를 뺀 단색이다 */
  material?: TaskbarMaterial;
};

// 재질별 칠(피그마 칠 스타일)과 효과(피그마 효과 스타일: 배경 흐림)다.
const materialClassNames = {
  acrylic: 'material-acrylic-base',
  solid: 'bg-material-fallback-acrylic-base',
} as const satisfies Record<TaskbarMaterial, string>;

/**
 * 화면 아래 작업 표시줄(피그마 Taskbar)을 그린다. 가운데에 Start·검색·앱 버튼, 오른쪽에 SystemTray를 둔다.
 * 고정되거나 실행 중인 앱의 TaskbarButton은 children 자리(피그마 Apps 슬롯)에 넣는다.
 * 높이는 Windows가 정한 48로 고정하고, 너비는 쓰는 곳이 정한다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function Taskbar(props: TaskbarProps): JSX.Element {
  const { search = 'box', material = 'acrylic', className, children, ...divProps } = props;
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
      <div className="h-full min-w-0 flex-1" />
      <div className="flex shrink-0 items-center gap-4">
        <TaskbarButton
          label="시작"
          icon={<Asset name="illustrations/logo-windows.svg" className="size-full" />}
        />
        {search === 'box' ? (
          <SearchBox appearance="taskbar" aria-label="검색" placeholder="검색" className="w-220" />
        ) : (
          <TaskbarButton
            label="검색"
            icon={
              <Asset
                name="icons/ic_fluent_search_20_regular.svg"
                className="size-full text-text-fill-primary"
              />
            }
          />
        )}
        {/* 피그마 Apps 슬롯이다. 비어 있어도 버튼 하나 자리(40)를 차지한다. */}
        <div className="flex h-40 min-w-40 items-end gap-4">{children}</div>
      </div>
      <div className="flex h-full min-w-0 flex-1 items-center justify-end overflow-hidden">
        <SystemTray />
      </div>
    </div>
  );
}

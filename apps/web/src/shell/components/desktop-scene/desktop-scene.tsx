import type { JSX, ReactNode } from 'react';

import { DesktopWallpaper } from '@/features/desktop/desktop';

type DesktopSceneProps = {
  /** 피그마 icons 프레임 자리. `DesktopIcons`(앱은 저장소에 이은 `DesktopIconsLayer`)를 넣는다 */
  icons: ReactNode;
  /** 창 층·패널 층 자리. 아이콘 위, 작업 표시줄 아래에 겹친다 */
  children?: ReactNode;
  /** 피그마 Taskbar/Default 인스턴스 자리. `TaskbarDefault`(앱은 저장소에 이은 `TaskbarLayer`)를 넣는다 */
  taskbar: ReactNode;
  /** 바탕화면 전체를 조작할 수 없게 할지(다시 시작하는 동안). 포커스와 보조 기술도 닿지 않는다 */
  inert?: boolean;
  /** 바깥 배치 클래스. 크기는 쓰는 곳(화면)이 정한다 */
  className?: string;
};

/**
 * 바탕화면 한 장(피그마 조립 `Desktop/Scene` = 배경화면 + 아이콘 + 작업 표시줄)의 화면 배치를 그린다.
 * 화면을 꽉 채우는 배경화면 위에 아이콘 영역을 두고, 그 영역에 창 층·패널 층 자리를 겹치며, 맨 아래에 작업 표시줄 자리를 붙인다.
 * 배경화면과 아이콘은 바탕화면 기능(`features/desktop`)이 그리고, 다른 기능을 엮어 쌓는 배치는 shell이 한다.
 * 바탕화면을 `DesktopWallpaper`와 `DesktopIcons`로 나눈 것은 배경화면이 작업 표시줄 뒤까지(장면 전체에) 깔리고 아이콘은
 * 작업 표시줄 위 영역에만 놓이기 때문이다. 둘을 한 덩어리로 묶으면 배경화면이 아이콘 영역 크기로 줄거나, 작업 표시줄을 그 안에
 * 넣어야 해 피그마 `Desktop/Scene`과 DOM 구조가 바뀐다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @codocs [[바탕화면:배경화면]]
 * @param props
 */
export function DesktopScene(props: DesktopSceneProps): JSX.Element {
  const { icons, children, taskbar, inert: isInert, className } = props;
  return (
    <div
      inert={isInert}
      className={['relative flex flex-col overflow-clip', className].filter(Boolean).join(' ')}
    >
      {/* 배경화면은 맨 아래에 깔고, 뒤에 오는 자리(relative)가 그 위에 그려진다 */}
      <DesktopWallpaper />
      <div className="relative min-h-0 flex-1">
        {icons}
        {children}
      </div>
      <div className="relative shrink-0">{taskbar}</div>
    </div>
  );
}

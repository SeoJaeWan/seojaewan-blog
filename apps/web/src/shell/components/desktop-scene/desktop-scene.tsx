import type { JSX, ReactNode } from 'react';

import type { DesktopIcon, DesktopIconView } from '@/features/desktop/desktop';
import { DesktopIcons, DesktopWallpaper } from '@/features/desktop/desktop';

type DesktopSceneProps = {
  /** 피그마 icons 프레임의 아이콘. 격자 순서(위에서 아래, 그다음 왼쪽에서 오른쪽)대로 놓는다 */
  icons: readonly DesktopIcon[];
  /** 아이콘 크기. 피그마 조립은 보통 아이콘이다 */
  iconView?: DesktopIconView;
  /** 창 층·패널 층 자리. 아이콘 위, 작업 표시줄 아래에 겹친다 */
  children?: ReactNode;
  /** 피그마 Taskbar/Default 인스턴스 자리. `TaskbarDefault`를 넣는다 */
  taskbar: ReactNode;
  /** 아이콘을 열었을 때 부른다. 데스크톱은 더블클릭, 모바일은 탭(클릭)으로 연다(`iconOpenGesture`) */
  onIconOpen?: (icon: DesktopIcon) => void;
  /** 아이콘을 여는 동작. 데스크톱은 double-click, 모바일은 click이다 */
  iconOpenGesture?: 'double-click' | 'click';
  /** 바깥 배치 클래스. 크기는 쓰는 곳(화면)이 정한다 */
  className?: string;
};

/**
 * 바탕화면 한 장(피그마 조립 `Desktop/Scene` = 배경화면 + 아이콘 + 작업 표시줄)의 화면 배치를 그린다.
 * 화면을 꽉 채우는 배경화면 위에 아이콘 영역을 두고, 그 영역에 창 층·패널 층 자리를 겹치며, 맨 아래에 작업 표시줄 자리를 붙인다.
 * 배경화면과 아이콘은 바탕화면 기능(`features/desktop`)이 그리고, 다른 기능을 엮어 쌓는 배치는 shell이 한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @codocs [[바탕화면:배경화면]]
 * @param props
 */
export function DesktopScene(props: DesktopSceneProps): JSX.Element {
  const { children, taskbar, className, ...iconsProps } = props;
  return (
    <div className={['relative flex flex-col overflow-clip', className].filter(Boolean).join(' ')}>
      {/* 배경화면은 맨 아래에 깔고, 뒤에 오는 자리(relative)가 그 위에 그려진다 */}
      <DesktopWallpaper />
      <div className="relative min-h-0 flex-1">
        <DesktopIcons {...iconsProps} />
        {children}
      </div>
      <div className="relative shrink-0">{taskbar}</div>
    </div>
  );
}

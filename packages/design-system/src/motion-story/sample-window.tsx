import type { JSX } from 'react';

import { cn } from '../cn';
import { WindowFrame, type WindowFramePlacement } from '../components/window-frame/window-frame';

// 견본의 WindowFrame 인스턴스가 쓰는 기본 앱 아이콘(app/File Explorer)이다.
const appIcon = new URL('../assets/images/app-file-explorer.png', import.meta.url).href;

type SampleWindowProps = {
  /** 모션 클래스 */
  motionClassName: string;
  /** 피그마 Placement. 견본 인스턴스의 값을 준다 */
  placement?: WindowFramePlacement;
};

/**
 * 창 모션 견본(motion-window-*)의 WindowFrame 인스턴스(800x500, 창 제목, 기본 앱 아이콘)를 그리고 모션 클래스를 건다.
 * @codocs [[피그마 연동:모션]]
 * @param props 견본 창 속성
 * @returns 견본 창
 */
export function SampleWindow(props: SampleWindowProps): JSX.Element {
  const { motionClassName, placement = 'normal' } = props;
  return (
    <WindowFrame
      title="창 제목"
      placement={placement}
      appIcon={<img src={appIcon} alt="" className="size-full object-contain" />}
      className={cn('h-500 w-800', motionClassName)}
    />
  );
}

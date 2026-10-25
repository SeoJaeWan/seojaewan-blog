import type { JSX } from 'react';

import { ShellSurface } from '../components/shell-surface/shell-surface';

type SamplePanelProps = {
  /** 모션 클래스 */
  motionClassName: string;
};

/**
 * 패널 모션 견본(motion-panel-*)의 ShellSurface 인스턴스(desktop 640x720)를 그리고 모션 클래스를 건다.
 * 패널은 화면 밖으로 드나들므로 스테이지(패널과 같은 크기)에서 넘치는 부분을 잘라 낸다.
 * @codocs [[피그마 연동:모션]]
 * @param props 견본 패널 속성
 * @returns 견본 패널과 스테이지
 */
export function SamplePanel(props: SamplePanelProps): JSX.Element {
  const { motionClassName } = props;
  return (
    <div className="h-720 w-640 overflow-hidden">
      <ShellSurface className={motionClassName} />
    </div>
  );
}

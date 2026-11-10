import type { JSX } from 'react';

import { ShellSurface } from '../components/shell-surface/shell-surface';

type SamplePanelProps = {
  motionClassName: string;
};

/**
 * 패널 모션 흐름(motion-panel-*)의 ShellSurface 인스턴스(desktop 832x862)를 그리고 모션 클래스를 건다.
 * 패널은 화면 밖으로 드나들므로 스테이지(패널과 같은 크기)에서 넘치는 부분을 잘라 낸다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 패널과 스테이지
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SamplePanel({ motionClassName }: SamplePanelProps): JSX.Element {
  return (
    <div className="h-size-shell-height w-size-shell-width overflow-hidden">
      <ShellSurface className={motionClassName} />
    </div>
  );
}

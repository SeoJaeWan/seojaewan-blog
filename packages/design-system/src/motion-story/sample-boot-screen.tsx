import type { JSX } from 'react';

import bootScreenExport from '../../figma/components/boot-screen/export.json';
import { BootScreen } from '../components/boot-screen/boot-screen';
import { FigmaFrame } from '../story/figma-frame';

type SampleBootScreenProps = {
  /** 모션 클래스 */
  motionClassName: string;
};

/**
 * 재부팅 화면 모션 견본(motion-boot-screen-*)의 BootScreen 인스턴스를 그리고 모션 클래스를 건다.
 * BootScreen 피그마 원본 크기(FigmaFrame, BootScreen export.json의 desktop 변형)로 감싼다.
 * BootScreen 안의 ProgressRing(`motion-progress-ring`)은 컴포넌트가 이미 붙인 그대로 함께 돈다.
 * @codocs [[피그마 연동:모션]]
 * @param props 견본 재부팅 화면 속성
 * @returns 견본 재부팅 화면
 */
export function SampleBootScreen(props: SampleBootScreenProps): JSX.Element {
  const { motionClassName } = props;
  return (
    <FigmaFrame source={bootScreenExport} args={{ device: 'desktop' }}>
      <BootScreen className={motionClassName} aria-label="재부팅 화면" />
    </FigmaFrame>
  );
}

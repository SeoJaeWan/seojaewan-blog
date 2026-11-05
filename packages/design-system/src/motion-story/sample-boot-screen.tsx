import type { JSX } from 'react';

import bootScreenExport from '../../figma/components/boot-screen/export.json';
import { BootScreen } from '../components/boot-screen/boot-screen';
import { FigmaFrame } from '../story/figma-frame';

type SampleBootScreenProps = {
  motionClassName: string;
};

/**
 * 재부팅 화면 모션 견본(motion-boot-screen-*)의 BootScreen 인스턴스를 그리고 모션 클래스를 건다.
 * BootScreen 피그마 원본 크기(FigmaFrame, BootScreen export.json의 desktop 변형)로 감싼다.
 * BootScreen 안의 ProgressRing(`motion-progress-ring`)은 컴포넌트가 이미 붙인 그대로 함께 돈다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 재부팅 화면
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SampleBootScreen({ motionClassName }: SampleBootScreenProps): JSX.Element {
  return (
    <FigmaFrame source={bootScreenExport} args={{ device: 'desktop' }}>
      <BootScreen className={motionClassName} aria-label="재부팅 화면" />
    </FigmaFrame>
  );
}

import type { JSX } from 'react';

import { BootScreen } from '../components/boot-screen/boot-screen';

type SampleBootScreenProps = {
  /** 모션 클래스 */
  motionClassName: string;
};

/**
 * 재부팅 화면 모션 견본(motion-boot-screen-*)의 BootScreen 인스턴스를 그리고 모션 클래스를 건다.
 * 실제 화면(desktop 1280x720)은 스토리에 너무 커서 같은 비율(16:9)의 절반 크기 스테이지에 CSS `scale`로 줄여 그린다.
 * BootScreen 안의 ProgressRing(`motion-progress-ring`)은 컴포넌트가 이미 붙인 그대로 함께 돈다.
 * @codocs [[피그마 연동:모션]]
 * @param props 견본 재부팅 화면 속성
 * @returns 견본 재부팅 화면과 스테이지
 */
export function SampleBootScreen(props: SampleBootScreenProps): JSX.Element {
  const { motionClassName } = props;
  return (
    <div className="aspect-video w-640 overflow-hidden">
      <div className="origin-top-left scale-50">
        <BootScreen className={motionClassName} aria-label="재부팅 화면" />
      </div>
    </div>
  );
}

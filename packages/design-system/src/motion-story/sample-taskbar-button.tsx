import type { JSX } from 'react';

import { TaskbarButton } from '../components/taskbar-button/taskbar-button';

// 견본 TaskbarButton 인스턴스의 icon 기본 인스턴스(파일 탐색기 앱 아이콘)다.
const appIcon = new URL('../assets/images/app-file-explorer.webp', import.meta.url).href;

type SampleTaskbarButtonProps = {
  motionClassName: string;
};

/**
 * 순서 바꾸기 끌기 모션 견본(motion-reorder-*)의 TaskbarButton 인스턴스를 그리고 모션 클래스를 건다.
 * 작업 표시줄 앱 버튼·탭·Start 고정됨 칸이 함께 쓰는 움직임이라 견본은 작업 표시줄 앱 버튼 하나로 보여 준다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 작업 표시줄 앱 버튼
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SampleTaskbarButton({ motionClassName }: SampleTaskbarButtonProps): JSX.Element {
  return (
    <TaskbarButton
      label="파일 탐색기"
      icon={<img src={appIcon} alt="" />}
      className={motionClassName}
    />
  );
}

import type { JSX } from 'react';

import windowFrameExport from '../../figma/components/window-frame/export.json';
import { WindowFrame, type WindowFramePlacement } from '../components/window-frame/window-frame';
import { FigmaFrame } from '../story/figma-frame';

// 견본의 WindowFrame 인스턴스가 쓰는 기본 앱 아이콘(app/File Explorer)이다.
const appIcon = new URL('../assets/images/app-file-explorer.webp', import.meta.url).href;

type SampleWindowProps = {
  motionClassName: string;
  placement?: WindowFramePlacement;
};

/**
 * 창 모션 견본(motion-window-*)의 WindowFrame 인스턴스(창 제목, 기본 앱 아이콘)를 그리고 모션 클래스를 건다.
 * 창 크기는 쓰는 곳이 정하므로 WindowFrame 피그마 원본 크기(FigmaFrame, WindowFrame export.json)로 감싼다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 창
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 * @param props.placement 피그마 Placement. 견본 인스턴스의 값을 준다
 */
export function SampleWindow({
  motionClassName,
  placement = 'default',
}: SampleWindowProps): JSX.Element {
  return (
    <FigmaFrame source={windowFrameExport}>
      <WindowFrame
        title="창 제목"
        placement={placement}
        appIcon={<img src={appIcon} alt="" className="size-full object-contain" />}
        className={motionClassName}
      />
    </FigmaFrame>
  );
}

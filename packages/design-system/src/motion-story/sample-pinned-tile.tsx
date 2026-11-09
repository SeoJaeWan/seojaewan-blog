import type { JSX } from 'react';

import { PinnedTile } from '../components/pinned-tile/pinned-tile';

// 견본 PinnedTile 인스턴스의 Item icon 기본 인스턴스(파일 탐색기 앱 아이콘)다.
const appIcon = new URL('../assets/images/app-file-explorer.webp', import.meta.url).href;

type SamplePinnedTileProps = {
  motionClassName: string;
};

/**
 * Start 고정됨 메뉴 이동 모션 견본(motion-start-pinned-move-*)의 PinnedTile 인스턴스를 그리고 모션 클래스를 건다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 고정 항목 칸
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SamplePinnedTile({ motionClassName }: SamplePinnedTileProps): JSX.Element {
  return <PinnedTile icon={<img src={appIcon} alt="" />} className={motionClassName} />;
}

/**
 * Start 고정됨 메뉴 이동의 교차 페이드 흐름(motion-start-pinned-move-swap)처럼 칸 하나를 옛 자리와 새 자리에 함께 그리고 둘 다 모션 클래스를 건다.
 * 옛 자리 칸은 `data-move-place="old"`로 사라지고 새 자리 칸은 나타난다. 두 칸이 같은 속성(투명도)을 움직이므로
 * 키프레임 값 검사가 흐름의 레이어(old place·new place)와 짝짓도록 `data-motion-node`를 단다.
 * @codocs [[피그마 연동:모션]]
 * @returns 옛 자리와 새 자리 칸
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SamplePinnedSwap({ motionClassName }: SamplePinnedTileProps): JSX.Element {
  return (
    <div className="flex gap-spacing-lg">
      <PinnedTile
        icon={<img src={appIcon} alt="" />}
        className={motionClassName}
        data-move-place="old"
        data-motion-node="old place"
      />
      <PinnedTile
        icon={<img src={appIcon} alt="" />}
        className={motionClassName}
        data-motion-node="new place"
      />
    </div>
  );
}

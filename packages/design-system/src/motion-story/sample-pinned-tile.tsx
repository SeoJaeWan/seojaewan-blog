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

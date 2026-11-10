import type { JSX } from 'react';

import { Asset } from '../components/asset/asset';
import { ImageAsset } from '../components/image-asset/image-asset';
import { PinnedTile } from '../components/pinned-tile/pinned-tile';
import { StartCategoryFolder } from '../components/start-category-folder/start-category-folder';

const linkIcon = <Asset name="illustrations/file-link.svg" />;
const folderIcon = <ImageAsset name="images/file-folder" alt="" />;

// 견본 Tiles 슬롯 기본 내용(PinnedTile 8개)이다.
const SAMPLE_TILES = [
  { label: 'File Explorer', icon: <ImageAsset name="images/app-file-explorer" alt="" /> },
  { label: 'Chrome', icon: <ImageAsset name="images/app-chrome" alt="" /> },
  { label: 'Blog', icon: folderIcon },
  { label: 'GitHub', icon: linkIcon },
  { label: '이력서', icon: linkIcon },
  { label: '사이드 프로젝트', icon: linkIcon },
  { label: 'React', icon: folderIcon },
  { label: 'React 19 훅 정리', icon: <ImageAsset name="images/file-document" alt="" /> },
] as const;

type SampleCategoryFolderProps = {
  motionClassName: string;
};

/**
 * Start 범주 팝업 열기·닫기 모션 견본(motion-start-category-folder-open·close)의 StartCategoryFolder 인스턴스를 그리고 모션 클래스를 건다.
 * 팝업 전체가 움직이므로 클래스는 컴포넌트에 건다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 범주 팝업
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SampleCategoryFolder({ motionClassName }: SampleCategoryFolderProps): JSX.Element {
  return (
    <StartCategoryFolder label="글" className={motionClassName}>
      {SAMPLE_TILES.map((tile) => (
        <PinnedTile key={tile.label} label={tile.label} icon={tile.icon} />
      ))}
    </StartCategoryFolder>
  );
}

import type { JSX } from 'react';

import { cn } from '../cn';
import { ImageAsset } from '../components/image-asset/image-asset';
import { PinnedTile } from '../components/pinned-tile/pinned-tile';

// 견본의 격자는 4열 × 6줄(24칸)이라 한 쪽(3줄)이 두 개다.
const PAGE_ROW_COUNT = 3;
const GRID_TILE_COUNT = 24;

type SampleCategoryFolderPageProps = {
  motionClassName: string;
};

/**
 * Start 범주 팝업 쪽 넘김 모션 견본(motion-start-category-folder-page)을 그린다.
 * 견본의 `page clip`(격자를 자르는 틀)과 `tile grid`(항목 격자)를 구성하고, 모션 클래스는 격자에 건다.
 * 틀 높이는 한 쪽(3줄)이다. 투명한 한 쪽 높이 칸이 틀의 높이를 정하고, 격자는 그 위에 겹쳐 두 쪽만큼 이어진다.
 * 제목과 쪽 표시 점, 쪽 표시 점이 바뀌는 모습은 재현하지 않는다.
 * @codocs [[피그마 연동:모션]]
 * @returns 견본 틀과 격자
 * @param props 컴포넌트 속성
 * @param props.motionClassName 모션 클래스
 */
export function SampleCategoryFolderPage({
  motionClassName,
}: SampleCategoryFolderPageProps): JSX.Element {
  return (
    <div className="relative w-size-start-category-folder-width overflow-hidden px-spacing-3xl">
      <div aria-hidden className="invisible flex flex-col">
        {Array.from({ length: PAGE_ROW_COUNT }, (_, index) => (
          <div key={index} className="h-size-pinned-tile-height" />
        ))}
      </div>
      <div
        data-motion-node="tile grid"
        className={cn(
          'absolute inset-x-spacing-3xl top-spacing-none flex flex-wrap content-start [&>*]:w-size-start-category-folder-item-width',
          motionClassName,
        )}
      >
        {Array.from(
          { length: GRID_TILE_COUNT },
          /**
           * 격자 칸 하나의 항목을 그린다.
           * @param _ 쓰지 않는 값
           * @param index 칸 순서(0부터)
           * @returns 고정 항목 칸
           */
          (_, index) => (
            <PinnedTile
              key={index}
              label={`항목 ${String(index + 1)}`}
              icon={<ImageAsset name="images/file-document" alt="" />}
            />
          ),
        )}
      </div>
    </div>
  );
}

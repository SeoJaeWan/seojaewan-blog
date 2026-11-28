import type { AssetGroup } from '../../../../packages/design-system/src/figma-contract';
import { FOUNDATIONS_PAGE } from '../plugin-config';
import type { AssetKind } from './node-data';

// Foundations 자산 묶음을 원본 컴포넌트가 놓인 구역으로 정하는 순수 계산이다([[디자인 시스템:자산]]).

/** 아이콘을 담는 구역 프레임 이름 */
export const ICONS_FRAME = 'Foundations / Icons';
/** 아이콘 밖의 자산을 담는 구역 프레임 이름. 그 안의 `group/<묶음>` 프레임 이름이 묶음이다 */
export const ASSETS_FRAME = 'Foundations / Assets';
/** 묶음 프레임 이름 앞부분 */
export const ASSET_GROUP_PREFIX = 'group/';

/**
 * 묶음 이름 → 처리 방식
 * @codocs [[디자인 시스템:자산]]
 */
export const assetKinds: Readonly<Record<AssetGroup, AssetKind>> = {
  Icons: 'mono',
  Shapes: 'mono',
  Illustrations: 'color',
  Images: 'raster',
};

/**
 * 원본 컴포넌트의 자산 묶음을 정한다. Foundations 페이지의 `Foundations / Icons` 아래 컴포넌트는 Icons다.
 * `Foundations / Assets` 아래 컴포넌트는 그것이 든 `group/<묶음>` 프레임의 이름이 묶음이다.
 * 다른 곳의 `group/` 프레임(색 견본 등)은 자산 묶음이 아니다.
 * @codocs [[디자인 시스템:자산]]
 * @param pageName 원본 컴포넌트가 놓인 페이지 이름
 * @param ancestors 원본 컴포넌트의 조상 이름. 페이지 바로 아래부터 가장 가까운 것까지다
 * @returns 자산 묶음, 자산이 아니면 null
 */
export function assetGroupOf(pageName: string, ancestors: readonly string[]): AssetGroup | null {
  if (pageName !== FOUNDATIONS_PAGE) {
    return null;
  }
  if (ancestors.includes(ICONS_FRAME)) {
    return 'Icons';
  }
  const assetsIndex = ancestors.indexOf(ASSETS_FRAME);
  if (assetsIndex < 0) {
    return null;
  }
  for (const name of ancestors.slice(assetsIndex + 1).reverse()) {
    if (!name.startsWith(ASSET_GROUP_PREFIX)) {
      continue;
    }
    const group = name.slice(ASSET_GROUP_PREFIX.length);
    if (group === 'Shapes' || group === 'Illustrations' || group === 'Images') {
      return group;
    }
  }
  return null;
}

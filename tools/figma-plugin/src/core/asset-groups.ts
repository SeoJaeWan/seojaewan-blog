// Foundations 자산 묶음. 원본 컴포넌트를 담은 묶음 프레임(`group/<묶음>`)의 이름이 처리 방식을 정한다.

// @codocs [[피그마 연동:자산]]
/** 묶음 프레임 이름 앞부분 */
export const ASSET_GROUP_PREFIX = 'group/';

// @codocs [[피그마 연동:자산]]
/** 묶음 이름 → 처리 방식 */
export const ASSET_GROUPS = {
  Icons: 'mono',
  Shapes: 'mono',
  Illustrations: 'color',
  Images: 'raster',
} as const;

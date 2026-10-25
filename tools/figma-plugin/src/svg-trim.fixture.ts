import type { AffineTransform, TrimmedVector } from './svg-trim';

// 피그마 파일의 진행 링 호 자산(`progress-ring/Arc`, 356:23128)과 그 안 벡터 `Arc`(739:5)에서 읽은 실제 값이다.

/** 자산 컴포넌트의 absoluteTransform */
export const arcComponentTransform: AffineTransform = [
  [1, 0, 49],
  [0, 1, 13597],
];

/** 벡터 `Arc`의 absoluteTransform */
export const arcVectorTransform: AffineTransform = [
  [1, 0, 50.49916076660156],
  [0, 1, 13598.4990234375],
];

/** 벡터 `Arc`의 vectorPaths[0].data(트림 전 원 전체, 벡터 좌표) */
export const ARC_PATH_DATA =
  'M 26.081037521362305 5.7744975090026855 C 30.89873743057251 12.167797565460205 29.623838901519775 21.255698204040527 23.232938766479492 26.076698303222656 C 16.84203863143921 30.897598266601562 7.7534379959106445 29.627197265625 2.929337978363037 23.238697052001953 C -1.8947620391845703 16.850196838378906 -0.6289615631103516 7.760997533798218 5.757138252258301 2.933697462081909 C 12.143238067626953 -1.8936026096343994 21.233137607574463 -0.6323027610778809 26.06353759765625 5.751297473907471';

/** PATH_TRIM_END baseValue(피그마가 준 float 값 그대로) */
export const ARC_TRIM_END = 0.46000000834465027;

/** 피그마 서버(MCP use_figma)의 exportAsync SVG. 목표 꼴이다 */
export const serverArcSvg =
  '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M27.5802 7.27352C32.3979 13.6668 31.123 22.7547 24.7321 27.5757C18.3412 32.3966 9.2526 31.1262 4.4285 24.7377C-0.395601 18.3492 0.870199 9.26002 7.2563 4.43272C13.6424 -0.394579 22.7323 0.866721 27.5627 7.25032" pathLength="1" stroke="#005FB8" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.46 1"/>\n' +
  '</svg>\n';

/**
 * 피그마 데스크톱 앱(126.10) 꼴의 SVG. 트림을 경로에 구워 호 조각만 있고 pathLength·dasharray가 없으며 속성 순서도 다르다.
 * 구운 경로는 줄여 적었다(어떤 경로든 벡터 경로로 바뀌어야 한다).
 */
export const desktopArcSvg =
  '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  '<path d="M27.5802 7.27352C32.3979 13.6668 31.123 22.7547 24.7321 27.5757" stroke-width="3" stroke-linecap="round" stroke="#005FB8"/>\n' +
  '</svg>\n';

/**
 * 진행 링 호 벡터의 트림 정보를 만든다.
 * @param overrides 바꿀 값
 * @returns 트림 벡터
 */
export function arcVector(overrides: Partial<TrimmedVector> = {}): TrimmedVector {
  return {
    name: 'Arc',
    paths: [ARC_PATH_DATA],
    transform: [
      [1, 0, arcVectorTransform[0][2] - arcComponentTransform[0][2]],
      [0, 1, arcVectorTransform[1][2] - arcComponentTransform[1][2]],
    ],
    start: 0,
    end: ARC_TRIM_END,
    ...overrides,
  };
}

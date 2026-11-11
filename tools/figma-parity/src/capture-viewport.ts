// 모션 검사가 쓰는 기본 화면 크기다. 설정 파일(playwright*.config.ts)이 읽으므로 Playwright 밖의 것을 가져오지 않는다.

/**
 * 기본 화면 크기(CSS px). 피그마 견본은 PC 구간이라, 노트북 구간(폭 1600 미만 또는 높이 900 미만) 규칙이
 * 섞이지 않게 노트북 경계(1600×900) 이상으로 고정한다.
 * @codocs [[피그마 연동:모션]]
 */
export const CAPTURE_VIEWPORT = { width: 1600, height: 900 } as const;

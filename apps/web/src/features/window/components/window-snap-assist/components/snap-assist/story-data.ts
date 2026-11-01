// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Snap Assist 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/**
 * 피그마 Window/SnapAssist: 제안 창 하나(Chrome 창)의 제목과 축소 화면.
 * 축소 화면은 Window/Chrome `Device=Desktop`(1280×800)을 WindowPreview 축소 화면 자리(192×108)의 높이에 맞춰 줄인 것이다.
 * 실제 비율은 창 크기에 따라 실행 중에 정해지고, 스토리는 피그마 값(108 / 800)을 쓴다.
 */
export const SNAP_ASSIST_CHROME = {
  id: 'chrome-1',
  title: 'React 19 훅 정리 - Chrome',
  window: { width: 1280, height: 800 },
  thumbnailScale: 0.135,
} as const;

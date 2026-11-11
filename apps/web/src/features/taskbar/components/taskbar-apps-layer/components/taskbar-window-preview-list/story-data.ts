// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄 미리보기 목록 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/**
 * 피그마 Taskbar/PreviewList: 탐색기 창들의 미리보기 제목과 축소 화면 속 창의 탭 제목. Count 값만큼 앞에서부터 쓴다.
 * 축소 화면은 모두 Window/Explorer `Device=Desktop, Folder=Blog, Selection=Single`이고, 탭 제목만 창마다 다르다.
 */
export const PREVIEW_WINDOWS = [
  { id: 'explorer-1', title: 'Blog - 파일 탐색기', tabTitle: 'Blog' },
  { id: 'explorer-2', title: 'React - 파일 탐색기', tabTitle: 'React' },
  { id: 'explorer-3', title: 'Next.js - 파일 탐색기', tabTitle: 'Next.js' },
] as const;

/**
 * 피그마 Taskbar/PreviewList 축소 화면: Window/Explorer(1024×640)를 축소 화면 높이(108)에 맞춰 줄인 것이다(108 / 640).
 * 카드 너비는 창 비율(1024 ÷ 640 = 1.6)을 따라 108 × 1.6 + 16 = 188.8이고, 축소 화면이 자리를 꽉 채운다.
 * 실제 비율은 창 크기에 따라 실행 중에 정해지고, 스토리는 피그마 값을 쓴다.
 */
export const PREVIEW_THUMBNAIL = {
  width: 1024,
  height: 640,
  scale: 0.16875,
  aspectRatio: 1.6,
} as const;

/**
 * 피그마 Taskbar/PreviewList `Device=Mobile` 목록 너비: 모바일 화면 폭 390에서 좌우 12px을 뺀 366이다.
 * 실제 앱은 화면 폭으로 실행 중에 구하고, 스토리는 피그마 값을 쓴다.
 */
export const PREVIEW_MOBILE_LIST_WIDTH = 366;

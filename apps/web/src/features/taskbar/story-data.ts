// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/**
 * 피그마 Taskbar/PreviewList: 탐색기 창들의 제목. Count 값만큼 앞에서부터 쓴다.
 * 축소 화면은 모두 Window/Explorer `Device=Desktop, Folder=Blog, Selection=Single`이고, 명령 모음 자리(Commands)가 비어 있다.
 */
export const PREVIEW_WINDOWS = [
  { id: 'explorer-1', title: 'Blog - 파일 탐색기' },
  { id: 'explorer-2', title: 'React - 파일 탐색기' },
  { id: 'explorer-3', title: 'Next.js - 파일 탐색기' },
] as const;

/**
 * 피그마 Taskbar/PreviewList 축소 화면: Window/Explorer(1024×640)를 WindowPreview 축소 화면 자리(192×108) 안에
 * 줄여 넣은 것이다(84 / 640). 실제 비율은 창 크기에 따라 실행 중에 정해지고, 스토리는 피그마 값을 쓴다.
 */
export const PREVIEW_THUMBNAIL = { width: 1024, height: 640, scale: 0.13125 } as const;

// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄(Taskbar/Default)을 그리는 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.
// 작업 표시줄 조립 스토리와, 작업 표시줄을 품은 바탕화면(Desktop/Scene)이 같은 시계를 그려서 기능 사이에 둔다.

/** 피그마 Taskbar/Default SystemTray의 시간과 날짜 */
export const TASKBAR_CLOCK = { time: '오후 3:24', date: '2026-10-20' } as const;

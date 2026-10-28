// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄 앱 메뉴(Menu/TaskbarApp)를 그리는 스토리가 함께 쓰는 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getTaskbarAppMenu } from '@/features/taskbar/utils/taskbar-app-rules/taskbar-app-rules';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/TaskbarApp: 작업 표시줄에 고정했고 창이 하나 열린 파일 탐색기 버튼 우클릭 */
export const menuTaskbarApp = getTaskbarAppMenu({
  app: 'file-explorer',
  isPinned: true,
  windowCount: 1,
  onAction: ignoreMenuAction,
});

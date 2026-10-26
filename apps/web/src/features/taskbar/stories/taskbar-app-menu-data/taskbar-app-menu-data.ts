// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄 앱 메뉴(Menu/TaskbarApp)를 그리는 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/TaskbarApp: 작업 표시줄 앱 버튼 우클릭 */
export const MENU_TASKBAR_APP = [
  { label: '파일 탐색기', icon: ICON.fileExplorer },
  SEPARATOR,
  { label: '작업 표시줄에서 고정 해제', icon: ICON.pin },
  { label: '창 닫기', icon: ICON.dismiss },
] as const;

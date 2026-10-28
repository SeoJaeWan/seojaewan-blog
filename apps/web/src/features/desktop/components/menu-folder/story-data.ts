// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/Folder 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/Folder: 바탕화면 폴더 우클릭 */
export const MENU_FOLDER = [
  { label: '열기', icon: ICON.open },
  { label: '새 창에서 열기', icon: ICON.window },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '잘라내기', icon: ICON.cut, shortcut: 'Ctrl+X' },
  { label: '이름 바꾸기', icon: ICON.rename, shortcut: 'F2' },
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

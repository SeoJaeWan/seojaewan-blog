// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/RecycleBin 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/RecycleBin: 바탕화면 휴지통 우클릭 */
export const MENU_RECYCLE_BIN = [
  { label: '열기', icon: ICON.open },
  SEPARATOR,
  { label: '휴지통 비우기', icon: ICON.delete },
] as const;

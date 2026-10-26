// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/StartTile 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/StartTile: Start 고정 항목 우클릭. 고정 해제 아이콘도 피그마처럼 핀이다 */
export const MENU_START_TILE = [
  { label: '열기', icon: ICON.open },
  { label: '맨 앞으로 이동', icon: ICON.arrowUp },
  { label: '링크 복사', icon: ICON.link },
  SEPARATOR,
  { label: '시작 화면에서 고정 해제', icon: ICON.pin },
] as const;

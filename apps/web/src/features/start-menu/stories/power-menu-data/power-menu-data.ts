// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start 전원 메뉴(Menu/Power)를 그리는 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/Power: Start 전원 메뉴 */
export const MENU_POWER = [{ label: '다시 시작', icon: ICON.refresh }] as const;

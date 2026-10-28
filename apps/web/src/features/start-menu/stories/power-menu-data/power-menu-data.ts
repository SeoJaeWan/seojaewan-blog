// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start 전원 메뉴(Menu/Power)를 그리는 스토리가 함께 쓰는 항목이다. 실제 메뉴 함수로 만든다.
import { getPowerMenuEntries } from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/Power: Start 전원 메뉴 */
export const menuPower = getPowerMenuEntries(ignoreMenuAction);

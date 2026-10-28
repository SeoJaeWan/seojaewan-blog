// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ChromeMoreMobile 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/ChromeMoreMobile: 모바일 Chrome ⋮ 메뉴 */
export const MENU_CHROME_MORE_MOBILE = [
  { label: '앞으로', icon: ICON.arrowRight },
  { label: '새로고침', icon: ICON.refresh },
  SEPARATOR,
  { label: '링크 복사', icon: ICON.link },
  { label: '페이지에서 찾기', icon: ICON.search },
  { kind: 'zoom', value: '100%' },
] as const;

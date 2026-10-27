import type { StartItem } from '@/features/start-menu/components/start-body/start-body';
import { APP_ITEM_IDS } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * Start 모두 목록과 고정됨에 나오는 앱 항목(File Explorer, Chrome). 앱은 작업 공간 저장소의 항목이 아니라 앱 둘의 상수이고,
 * 항목 id는 `APP_ITEM_IDS`의 id다. 폴더·글·외부 링크는 작업 공간 저장소에서 읽는다.
 * @codocs [[Start 메뉴:모두]]
 */
export const startApps = [
  { id: APP_ITEM_IDS['file-explorer'], kind: 'app', app: 'file-explorer', title: 'File Explorer' },
  { id: APP_ITEM_IDS.chrome, kind: 'app', app: 'chrome', title: 'Chrome' },
] as const satisfies readonly StartItem[];

/**
 * Start 아래 줄의 프로필(블로그 주인의 이름과 사진).
 * @codocs [[Start 메뉴:구성]]
 */
export const START_PROFILE = {
  name: '서재완',
  photo: 'images/avatar-profile',
} as const;

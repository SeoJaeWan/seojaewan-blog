import type {
  StartItem,
  StartItemGroup,
} from '@/features/start-menu/components/start-body/start-body';
import { groupByStartLetter } from '@/features/start-menu/utils/start-letter-rules/start-letter-rules';

/**
 * Start 고정됨에 처음 고정된 앱(File Explorer, Chrome). 폴더·글·외부 링크는 콘텐츠를 불러올 때 더한다.
 * @codocs [[Start 메뉴:고정됨]]
 */
export const startPinnedApps = [
  { kind: 'app', app: 'file-explorer', title: 'File Explorer' },
  { kind: 'app', app: 'chrome', title: 'Chrome' },
] as const satisfies readonly StartItem[];

/**
 * Start 모두 목록(간단히)의 앱. 첫 글자별로 묶고 묶음 안은 이름순이다. 폴더·글·외부 링크는 콘텐츠를 불러올 때 더한다.
 * @codocs [[Start 메뉴:모두]]
 */
export const startAppGroups: readonly StartItemGroup[] = groupByStartLetter<StartItem>([
  { kind: 'app', app: 'file-explorer', title: 'File Explorer' },
  { kind: 'app', app: 'chrome', title: 'Chrome' },
]);

/**
 * Start 아래 줄의 프로필(블로그 주인의 이름과 사진).
 * @codocs [[Start 메뉴:구성]]
 */
export const START_PROFILE = {
  name: '서재완',
  photo: 'images/avatar-profile',
} as const;

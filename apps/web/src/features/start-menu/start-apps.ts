import type { StartItem, StartItemGroup } from './start-body';

/**
 * Start 고정됨에 처음 고정된 앱(File Explorer, Chrome). 폴더·글·외부 링크는 콘텐츠를 불러올 때 더한다.
 * @codocs [[Start 메뉴:고정됨]]
 */
export const startPinnedApps = [
  { kind: 'app', app: 'file-explorer', title: 'File Explorer' },
  { kind: 'app', app: 'chrome', title: 'Chrome' },
] as const satisfies readonly StartItem[];

/**
 * Start 모두 목록(간단히)의 앱. 이름순으로 첫 글자별로 묶었다.
 * @codocs [[Start 메뉴:모두]]
 */
export const startAppGroups = [
  { label: 'C', items: [{ kind: 'app', app: 'chrome', title: 'Chrome' }] },
  { label: 'F', items: [{ kind: 'app', app: 'file-explorer', title: 'File Explorer' }] },
] as const satisfies readonly StartItemGroup[];

/**
 * Start 아래 줄의 프로필(블로그 주인의 이름과 사진).
 * @codocs [[Start 메뉴:구성]]
 */
export const START_PROFILE = {
  name: '서재완',
  photo: 'images/avatar-profile.png',
} as const;

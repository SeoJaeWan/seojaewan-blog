// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 작업 표시줄 앱 메뉴(Menu/TaskbarApp)와 점프 목록(Menu/TaskbarJumpList*)을 그리는 스토리가 함께 쓰는 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { ignoreMenuAction } from '@/shared/components/menu-popup/story-menu-preview';

import { getAppMenuEntries, getChromeJumpListEntries } from './app-menu-entries';

/** 피그마 Menu/TaskbarApp: 작업 표시줄에 고정했고 창이 하나 열린 파일 탐색기 버튼 우클릭 */
export const menuTaskbarApp = getAppMenuEntries({
  app: 'file-explorer',
  isPinned: true,
  windowCount: 1,
  onAction: ignoreMenuAction,
});

/** 피그마 Menu/TaskbarJumpListChrome "자주 방문"의 글 6개(Blog 최신 글) */
const JUMP_LIST_CHROME_POSTS = [
  { id: 'post:react-19-hooks', title: 'React 19 훅 정리' },
  { id: 'post:rsc', title: '리액트 서버 컴포넌트' },
  { id: 'post:nextjs-cache', title: 'Next.js 캐시' },
  { id: 'post:typescript-5-6', title: 'TypeScript 5.6' },
  { id: 'post:vitest', title: 'Vitest 테스트' },
  { id: 'post:figma-parity', title: 'Figma 일치 검사' },
] as const;

/** 피그마 Menu/TaskbarJumpListChrome: 작업 표시줄에 고정했고 창이 하나 열린 Chrome 버튼 우클릭 */
export const menuTaskbarJumpListChrome = getAppMenuEntries({
  app: 'chrome',
  isPinned: true,
  windowCount: 1,
  jumpList: getChromeJumpListEntries({
    posts: JUMP_LIST_CHROME_POSTS,
    onOpenPost: ignoreMenuAction,
    onNewWindow: ignoreMenuAction,
  }),
  onAction: ignoreMenuAction,
});

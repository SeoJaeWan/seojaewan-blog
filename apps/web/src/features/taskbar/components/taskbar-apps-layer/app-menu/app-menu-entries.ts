import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  MENU_ICONS,
  MENU_SEPARATOR,
  taskbarPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/** 앱 버튼 우클릭 메뉴에서 고를 수 있는 일 */
export type TaskbarAppMenuAction = 'open-new' | 'pin' | 'unpin' | 'close-windows';

/**
 * 앱 버튼 우클릭 메뉴가 보이는 상태와 동작. onAction은 항목을 고르면 그 일과 함께 부른다.
 * jumpList는 앱 묶음 위에 붙일 점프 목록 항목이다(앱마다 다른 목록을 쓰는 곳이 만든다). 비었거나 없으면 앱 묶음만 보인다.
 */
type TaskbarAppMenuOptions = {
  app: WindowApp;
  isPinned: boolean;
  windowCount: number;
  jumpList?: readonly MenuPopupEntry[];
  onAction: (action: TaskbarAppMenuAction) => void;
};

/**
 * 앱 버튼 우클릭 메뉴(피그마 `Menu/TaskbarApp`, 점프 목록이 있으면 `Menu/TaskbarJumpList*`)의 항목을 만든다.
 * 점프 목록이 있으면 맨 위에 두고 구분선 하나로 앱 묶음과 나눈다. 앱 묶음은 앱 이름(누르면 새 창), 작업 표시줄에 고정 또는 제거,
 * 창 닫기(창이 여러 개면 모든 창 닫기, 창이 없으면 항목을 숨긴다) 차례다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 앱과 창 상태, 점프 목록, 동작
 * @returns 메뉴 항목
 */
export function getAppMenuEntries(options: TaskbarAppMenuOptions): MenuPopupEntry[] {
  const { app, isPinned, windowCount, jumpList = [], onAction } = options;
  const entries: MenuPopupEntry[] = [
    {
      label: taskbarApps[app].label,
      icon: taskbarApps[app].icon,
      onClick: () => {
        onAction('open-new');
      },
    },
    taskbarPinMenuItem(isPinned, () => {
      onAction(isPinned ? 'unpin' : 'pin');
    }),
  ];
  if (windowCount > 0) {
    entries.push({
      label: windowCount > 1 ? '모든 창 닫기' : '창 닫기',
      icon: MENU_ICONS.dismiss,
      onClick: () => {
        onAction('close-windows');
      },
    });
  }
  return jumpList.length > 0 ? [...jumpList, MENU_SEPARATOR, ...entries] : entries;
}

// 글 아이콘은 Chrome 새 탭 페이지 바로가기와 같은 래스터 자산(피그마 file/Document)이다.
const POST_ICON = 'images/file-document';

/** "자주 방문"에 보일 글 하나. id는 작업 공간 항목 id, title은 글 제목이다. */
export type ChromeJumpListPost = {
  id: string;
  title: string;
};

/** Chrome 점프 목록이 보이는 글과 동작. onOpenPost는 글 항목을, onNewWindow는 "새 창"을 고르면 부른다. */
type ChromeJumpListOptions = {
  posts: readonly ChromeJumpListPost[];
  onOpenPost: (id: string) => void;
  onNewWindow: () => void;
};

/**
 * 작업 표시줄 Chrome 버튼 점프 목록(피그마 `Menu/TaskbarJumpListChrome`의 앱 묶음 위 칸)의 항목을 만든다.
 * 머리글 "자주 방문" 아래 Blog 최신 글(새 탭 페이지와 같은 글, 고정·제거 없음)을, 머리글 "작업" 아래 "새 창" 하나를 둔다.
 * 글이 없으면 "자주 방문" 칸을 숨긴다. 앱 묶음과의 구분선은 `getAppMenuEntries`가 붙인다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @param options 보일 글과 동작
 * @returns 점프 목록 항목
 */
export function getChromeJumpListEntries(options: ChromeJumpListOptions): MenuPopupEntry[] {
  const { posts, onOpenPost, onNewWindow } = options;
  const entries: MenuPopupEntry[] = [];
  if (posts.length > 0) {
    entries.push({
      kind: 'group',
      label: '자주 방문',
      entries: posts.map(
        /**
         * 글 하나를 항목으로 만든다.
         * @param post 글
         * @returns 메뉴 항목
         */
        (post) => ({
          label: post.title,
          icon: POST_ICON,
          onClick: () => {
            onOpenPost(post.id);
          },
        }),
      ),
    });
  }
  entries.push({
    kind: 'group',
    label: '작업',
    entries: [{ label: '새 창', icon: taskbarApps.chrome.icon, onClick: onNewWindow }],
  });
  return entries;
}

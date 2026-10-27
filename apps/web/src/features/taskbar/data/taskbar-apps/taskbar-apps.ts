// 작업 표시줄에 버튼을 두는 앱의 이름과 아이콘이다. 앱 버튼과 우클릭 메뉴가 함께 쓴다.

/** 작업 표시줄에 버튼을 두는 앱. 처음에 고정된 앱(File Explorer, Chrome)이다 */
export type TaskbarAppId = 'file-explorer' | 'chrome';

// 앱마다 버튼 아이콘(피그마 app/* 인스턴스)과 접근성 이름이다.
export const taskbarApps = {
  'file-explorer': { label: '파일 탐색기', icon: 'images/app-file-explorer' },
  chrome: { label: 'Chrome', icon: 'images/app-chrome' },
} as const satisfies Record<TaskbarAppId, { label: string; icon: string }>;

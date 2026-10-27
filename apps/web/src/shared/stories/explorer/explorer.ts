// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 탐색기 창(Window/Explorer)을 그리는 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.
// 탐색기 창 스토리와, 그 창을 줄여 넣는 작업 표시줄 창 미리보기(Taskbar/PreviewList 등)가 같은 창을 그려서 기능 사이에 둔다.

/** 피그마 Breadcrumb `Location icon` 기본 인스턴스(file/Folder)의 자산 */
export const FOLDER_LOCATION_ICON = 'images/file-folder';

/** 피그마 Window/Explorer 탭 제목과 위치 칸(BreadcrumbItem)으로 쓰는 위치 이름 */
export const LOCATION_NAMES = {
  desktop: '바탕 화면',
  blog: 'Blog',
  react: 'React',
  'recycle-bin': '휴지통',
} as const;

/** 피그마 Window/Explorer 주소 줄 검색 상자의 안내 글자. 현재 위치 이름 + "검색"이다 */
export const WINDOW_SEARCH_PLACEHOLDERS = {
  blog: 'Blog 검색',
  react: 'React 검색',
  'recycle-bin': '휴지통 검색',
} as const;

/**
 * 피그마 Window/Explorer 탐색 창의 폴더 트리. 현재 위치를 고르고(selected), React 폴더에 있으면 React를 펼친다.
 * icon은 아이콘(데스크톱 아이콘, file/Folder, file/Recycle Bin Full)을 고른다.
 */
export const WINDOW_NAVIGATION = {
  blog: [
    { label: '바탕 화면', level: 0, expand: 'expanded', icon: 'desktop' },
    { label: 'Blog', level: 1, expand: 'expanded', icon: 'folder', selected: true },
    { label: 'React', level: 2, expand: 'collapsed', icon: 'folder' },
    { label: 'Next.js', level: 2, expand: 'none', icon: 'folder' },
    { label: 'TypeScript', level: 2, expand: 'none', icon: 'folder' },
    { label: '휴지통', level: 0, expand: 'none', icon: 'recycle-bin' },
  ],
  react: [
    { label: '바탕 화면', level: 0, expand: 'expanded', icon: 'desktop' },
    { label: 'Blog', level: 1, expand: 'expanded', icon: 'folder' },
    { label: 'React', level: 2, expand: 'expanded', icon: 'folder', selected: true },
    { label: 'Hooks', level: 3, expand: 'none', icon: 'folder' },
    { label: 'Next.js', level: 2, expand: 'none', icon: 'folder' },
    { label: 'TypeScript', level: 2, expand: 'none', icon: 'folder' },
    { label: '휴지통', level: 0, expand: 'none', icon: 'recycle-bin' },
  ],
  'recycle-bin': [
    { label: '바탕 화면', level: 0, expand: 'expanded', icon: 'desktop' },
    { label: 'Blog', level: 1, expand: 'expanded', icon: 'folder' },
    { label: 'React', level: 2, expand: 'collapsed', icon: 'folder' },
    { label: 'Next.js', level: 2, expand: 'none', icon: 'folder' },
    { label: 'TypeScript', level: 2, expand: 'none', icon: 'folder' },
    { label: '휴지통', level: 0, expand: 'none', icon: 'recycle-bin', selected: true },
  ],
} as const;

/** 피그마 Window/Explorer의 폴더별 항목. kind는 아이콘(file/Folder, file/Document)을 고른다 */
export const WINDOW_FOLDER_ITEMS = {
  blog: [
    { name: 'React', kind: 'folder' },
    { name: 'Next.js', kind: 'folder' },
    { name: 'TypeScript', kind: 'folder' },
    { name: 'Notion 블로그 이전기', kind: 'post' },
    { name: '2026 상반기 회고', kind: 'post' },
  ],
  react: [
    { name: 'Hooks', kind: 'folder' },
    { name: 'React 19 훅 정리', kind: 'post' },
    { name: '리액트 서버 컴포넌트 이해하기', kind: 'post' },
    { name: 'React Compiler 도입기', kind: 'post' },
  ],
} as const;

/**
 * 피그마 Window/Explorer `Folder=Recycle Bin`의 지운 항목(자세히 보기). kind는 아이콘(file/Folder, file/Document, file/Link)을 고른다.
 */
export const WINDOW_RECYCLE_BIN_ITEMS = [
  { name: 'React', kind: 'folder', originalLocation: '바탕 화면\\Blog', deletedDate: '2026-10-21' },
  {
    name: 'Notion 블로그 이전기',
    kind: 'post',
    originalLocation: '바탕 화면\\Blog',
    deletedDate: '2026-10-18',
  },
  { name: 'GitHub', kind: 'link', originalLocation: '바탕 화면', deletedDate: '2026-10-15' },
] as const;

/** 피그마 Window/Explorer 상태 줄 글자 */
export const WINDOW_STATUS_TEXT = {
  itemCount: { blog: '항목 5개', react: '항목 4개', 'recycle-bin': '항목 3개' },
  selection: '1개 항목 선택함',
} as const;

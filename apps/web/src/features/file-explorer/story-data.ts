// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 파일 탐색기 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Breadcrumb `Location icon` 기본 인스턴스(file/Folder)의 자산 */
export const FOLDER_LOCATION_ICON = 'images/file-folder.png';

/** 피그마 ExplorerStatusBar 기본 글자 */
export const STATUS_BAR_TEXT = { itemCount: '항목 개수', selection: '선택 정보' } as const;

/** 피그마 빈 슬롯이 차지하는 미리보기 크기(px). 스토리는 이 크기의 칠 없는 빈 요소로 채운다 */
export const EMPTY_SLOT_SIZE = {
  /** Breadcrumb Items */
  breadcrumbItems: { width: 100, height: 100 },
  /** NavigationPane items */
  navigationItems: { width: 240, height: 192 },
} as const;

/** 피그마 Window/Explorer 탭 제목과 위치 칸(BreadcrumbItem)으로 쓰는 위치 이름 */
export const LOCATION_NAMES = { desktop: '바탕 화면', blog: 'Blog', react: 'React' } as const;

/** 피그마 Window/Explorer 주소 줄 검색 상자의 안내 글자. 피그마는 `Folder=React`에서도 이 글자다 */
export const WINDOW_SEARCH_PLACEHOLDER = 'Blog 검색';

/** 피그마 Window/Explorer 탐색 창의 폴더 트리(바탕 화면 › Blog 펼침, Blog 고름). 두 폴더 변형이 같다 */
export const WINDOW_NAVIGATION = [
  { label: '바탕 화면', level: 0, expand: 'expanded', icon: 'desktop' },
  { label: 'Blog', level: 1, expand: 'expanded', icon: 'folder', selected: true },
  { label: 'React', level: 2, expand: 'collapsed', icon: 'folder' },
  { label: 'Next.js', level: 2, expand: 'none', icon: 'folder' },
  { label: 'TypeScript', level: 2, expand: 'none', icon: 'folder' },
  { label: '휴지통', level: 0, expand: 'none', icon: 'recycle-bin' },
] as const;

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

/** 피그마 Window/Explorer 상태 줄 글자 */
export const WINDOW_STATUS_TEXT = {
  itemCount: { blog: '항목 5개', react: '항목 4개' },
  selection: '1개 항목 선택함',
} as const;

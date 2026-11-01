// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 파일 탐색기 내용 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.
// 탐색기 창(Window/Explorer) 데이터는 다른 기능의 창 축소 화면도 쓰므로 `shared/stories/explorer/explorer.ts`에 있다.

/** 피그마 ExplorerStatusBar 기본 글자 */
export const STATUS_BAR_TEXT = { itemCount: '항목 개수', selection: '선택 정보' } as const;

/** 피그마 빈 슬롯이 차지하는 미리보기 크기(px). 스토리는 이 크기의 칠 없는 빈 요소로 채운다 */
export const EMPTY_SLOT_SIZE = {
  /** Breadcrumb Items */
  breadcrumbItems: { width: 100, height: 100 },
  /** NavigationPane items */
  navigationItems: { width: 240, height: 192 },
} as const;

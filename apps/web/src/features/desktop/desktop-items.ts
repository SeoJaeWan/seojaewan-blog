/**
 * 처음 들어왔을 때 바탕화면에 놓이는 항목이다. 격자 순서(열 우선)대로 둔다.
 * 휴지통과 `Blog` 폴더는 초기 구조가 정하고, GitHub·이력서는 외부 링크의 초기 위치(바탕화면)다.
 * 휴지통은 비어 있는 모양이다. 저장된 배치와 Notion 글로 만든 구조는 콘텐츠를 붙일 때 이 목록을 대신한다.
 * @codocs [[작업 공간:초기 구조]]
 * @codocs [[항목 모델:외부 링크]]
 * @codocs [[바탕화면:표시하는 항목]]
 */
export const INITIAL_DESKTOP_ITEMS = [
  { id: 'recycle-bin', name: '휴지통', kind: 'recycle-bin' },
  { id: 'blog', name: 'Blog', kind: 'folder' },
  { id: 'github', name: 'GitHub', kind: 'link' },
  { id: 'resume', name: '이력서', kind: 'link' },
] as const;

// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Start/Body의 고정됨 항목 8개 */
export const START_PINNED = [
  { kind: 'app', app: 'file-explorer', title: 'File Explorer' },
  { kind: 'app', app: 'chrome', title: 'Chrome' },
  { kind: 'folder', title: 'Blog' },
  { kind: 'link', title: 'GitHub' },
  { kind: 'link', title: '이력서' },
  { kind: 'link', title: '사이드 프로젝트' },
  { kind: 'folder', title: 'React' },
  { kind: 'post', title: 'React 19 훅 정리' },
] as const;

/** 피그마 Start/Body `View=List`·`Grid`의 모두 목록. 이름순으로 첫 글자별로 묶었다 */
export const START_LETTER_GROUPS = [
  { label: 'B', items: [{ kind: 'folder', title: 'Blog' }] },
  { label: 'C', items: [{ kind: 'app', app: 'chrome', title: 'Chrome' }] },
  { label: 'F', items: [{ kind: 'app', app: 'file-explorer', title: 'File Explorer' }] },
  { label: 'G', items: [{ kind: 'link', title: 'GitHub' }] },
  { label: 'N', items: [{ kind: 'post', title: 'Next.js App Router 캐시' }] },
  {
    label: 'R',
    items: [
      { kind: 'folder', title: 'React' },
      { kind: 'post', title: 'React 19 훅 정리' },
    ],
  },
  { label: 'ㄹ', items: [{ kind: 'post', title: '리액트 서버 컴포넌트 이해하기' }] },
  { label: 'ㅅ', items: [{ kind: 'link', title: '사이드 프로젝트' }] },
  { label: 'ㅇ', items: [{ kind: 'link', title: '이력서' }] },
] as const;

/** 피그마 Start/JumpList에서 흐리지 않은(항목이 있는) 글자. 모두 목록의 첫 글자 묶음과 같다 */
export const startAvailableLetters = START_LETTER_GROUPS.map((group) => group.label);

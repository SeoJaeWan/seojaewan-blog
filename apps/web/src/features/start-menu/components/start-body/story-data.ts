// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start/Body 조립 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Start/Body `View=Category`의 모두 목록. 종류별로 묶고 묶음 안은 이름순이다 */
export const START_CATEGORY_GROUPS = [
  {
    label: '폴더',
    items: [
      { kind: 'folder', title: 'Blog' },
      { kind: 'folder', title: 'React' },
    ],
  },
  {
    label: '글',
    items: [
      { kind: 'post', title: 'Next.js App Router 캐시' },
      { kind: 'post', title: 'React 19 훅 정리' },
      { kind: 'post', title: '리액트 서버 컴포넌트 이해하기' },
    ],
  },
  {
    label: '외부 링크',
    items: [
      { kind: 'link', title: 'GitHub' },
      { kind: 'link', title: '사이드 프로젝트' },
      { kind: 'link', title: '이력서' },
    ],
  },
  {
    label: '앱',
    items: [
      { kind: 'app', app: 'chrome', title: 'Chrome' },
      { kind: 'app', app: 'file-explorer', title: 'File Explorer' },
    ],
  },
] as const;

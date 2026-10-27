// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start/Body 조립 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Start/Body `View=Category`의 모두 목록. 종류별로 묶고 묶음 안은 이름순이다 */
export const START_CATEGORY_GROUPS = [
  {
    label: '폴더',
    items: [
      { id: 'blog', kind: 'folder', title: 'Blog' },
      { id: 'folder:React', kind: 'folder', title: 'React' },
    ],
  },
  {
    label: '글',
    items: [
      { id: 'post:nextjs-app-router-cache', kind: 'post', title: 'Next.js App Router 캐시' },
      { id: 'post:react-19-hooks', kind: 'post', title: 'React 19 훅 정리' },
      { id: 'post:react-server-components', kind: 'post', title: '리액트 서버 컴포넌트 이해하기' },
    ],
  },
  {
    label: '외부 링크',
    items: [
      { id: 'link:github', kind: 'link', title: 'GitHub' },
      { id: 'link:side-project', kind: 'link', title: '사이드 프로젝트' },
      { id: 'link:resume', kind: 'link', title: '이력서' },
    ],
  },
  {
    label: '앱',
    items: [
      { id: 'app:chrome', kind: 'app', app: 'chrome', title: 'Chrome' },
      { id: 'app:file-explorer', kind: 'app', app: 'file-explorer', title: 'File Explorer' },
    ],
  },
] as const;

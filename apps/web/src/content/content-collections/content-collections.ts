// fixture를 받는 스크립트(`scripts/fetch-notion-fixture.ts`)가 Node로 이 파일을 바로 읽는다.
// 그래서 이 파일은 아무것도 import하지 않는다.

/**
 * 콘텐츠 묶음. Notion 데이터베이스 하나가 묶음 하나이고 바탕화면 폴더 `Blog`, `Project`, `About`을 채운다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 */
export const CONTENT_COLLECTIONS = ['blog', 'project', 'about'] as const;

/** 콘텐츠 묶음 */
export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];

/**
 * 운영 Notion 데이터베이스 ID. 환경마다 달라질 값이 아니라 환경 변수가 아닌 코드 상수다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 */
export const NOTION_DATABASE_IDS = {
  blog: '272c97ba-fd89-80a1-8c71-c8c9ec43dd1e',
  project: '272c97ba-fd89-80b8-b15b-ff6514232949',
  about: '2a3c97ba-fd89-80f2-83e2-ea5557ee9293',
} as const;

/**
 * fixture를 받는 시험용 Notion 데이터베이스 ID. 운영 데이터베이스 밖의 시험용 페이지(`NOTION_FIXTURE_PAGE_ID`) 안에 있고
 * 운영 데이터베이스와 속성이 같다. fixture 모드는 이 ID로 저장해 둔 응답을 읽는다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 */
export const NOTION_FIXTURE_DATABASE_IDS = {
  blog: '410c97ba-fd89-81db-b2ec-cfb1c4243045',
  project: '410c97ba-fd89-8159-ad1d-dec9f992bf3d',
  about: '410c97ba-fd89-81c8-82ec-d4e07f09851d',
} as const;

/**
 * 지원하는 블록과 지원하지 않는 블록을 모두 넣은 시험용 Notion 페이지 ID. 사이트에는 나오지 않고 변환 시험이 읽는다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 */
export const NOTION_FIXTURE_PAGE_ID = '410c97ba-fd89-8103-b336-eef24794d263';

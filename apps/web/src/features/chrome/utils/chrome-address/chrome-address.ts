// Chrome 주소창이 보여 주는 주소와, 주소창에 입력한 글자를 어디로 보낼지 정하는 규칙이다.

import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import { rankItems } from '@/shared/utils/search-rules/search-rules';
import {
  getPostItemId,
  isItemInTrash,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 주소창에 보이는 블로그 주소의 호스트 */
export const BLOG_HOST = 'seojaewan.com';

/** 주소창 추천에 보이는 글의 최대 개수 */
export const ADDRESS_SUGGESTION_POST_LIMIT = 5;

/** 주소창 추천 한 줄과 그 줄을 골랐을 때 갈 페이지 */
export type AddressSuggestionTarget =
  | {
      /** 글 추천 */
      kind: 'post';
      /** 글 제목 */
      title: string;
      /** 글 주소 */
      url: string;
      /** 갈 페이지 */
      page: ChromeTabPage;
    }
  | {
      /** 검색 추천 */
      kind: 'search';
      /** 보이는 글자 */
      title: string;
      /** 갈 페이지 */
      page: ChromeTabPage;
    };

/** 주소창에 입력하고 Enter를 눌렀을 때 할 일. 탭 안의 페이지로 가거나 실제 브라우저의 새 탭으로 연다 */
export type AddressAction =
  { type: 'page'; page: ChromeTabPage } | { type: 'external'; url: string };

type AddressWorkspace = Pick<WorkspaceState, 'items'>;

// 블로그 호스트 앞에 붙을 수 있는 www다.
const WWW_PREFIX = 'www.';

// `http://`처럼 스킴이 붙은 주소다.
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:\/\//iu;

// 스킴 없이 도메인으로 시작하는 주소다(`example.com`, `example.com/a`, `localhost:3000`).
// 최상위 도메인은 흔한 것만 본다. `Next.js`처럼 점이 든 글 제목을 외부 주소로 보내지 않기 위해서다.
const DOMAIN_PATTERN =
  /^(?:[^\s/?#.]+(?:\.[^\s/?#.]+)*\.(?:com|net|org|io|dev|app|kr|co|me|ai|gg|xyz|info|edu|gov|blog|page|site)|localhost)(?::\d+)?(?:[/?#]\S*)?$/iu;

// 글 주소의 경로다(`/posts/<slug>`).
const POST_PATH_PATTERN = /^\/posts\/([^/]+)\/?$/u;

/**
 * 글 주소(주소창에 보이는 모양). 예: `seojaewan.com/posts/react-19-hooks`
 * @codocs [[Chrome:글 주소]]
 * @param slug 글 slug
 * @returns 글 주소
 */
export function getPostAddress(slug: string): string {
  return `${BLOG_HOST}/posts/${slug}`;
}

/**
 * 페이지를 보고 있을 때 주소창에 보이는 글자. 글은 글 주소, 새 탭 페이지는 빈칸, 검색 결과는 검색어,
 * 찾을 수 없음 화면은 입력한 주소다.
 * @codocs [[Chrome:주소창]]
 * @param page 페이지
 * @returns 주소창 글자
 */
export function getPageAddress(page: ChromeTabPage): string {
  switch (page.kind) {
    case 'new-tab':
      return '';
    case 'post':
      return getPostAddress(page.slug);
    case 'search':
      return page.query;
    case 'not-found':
      return page.url;
  }
}

/**
 * 주소창에 입력한 글자를 어디로 보낼지 정한다.
 * - 블로그 글 주소(`seojaewan.com/posts/x`, `https://seojaewan.com/posts/x`, `/posts/x`): 그 글. 없는 글이면 찾을 수 없음 화면
 * - 블로그의 다른 주소: 첫 화면(`/`)은 새 탭 페이지, 그 밖은 찾을 수 없음 화면
 * - 외부 주소(`http(s)://…`, `example.com`처럼 도메인 꼴): 실제 브라우저의 새 탭
 * - 그 밖의 글자: 검색 결과 페이지
 * 휴지통에 든 글도 주소로는 열린다.
 * @codocs [[Chrome:주소창]]
 * @codocs [[Chrome:글 주소]]
 * @param input 입력한 글자
 * @param workspace 작업 공간(글 색인)
 * @param currentHost 지금 블로그가 열린 호스트(`location.host`). 이 호스트의 주소도 블로그 주소로 본다
 * @returns 할 일. 입력이 비었으면 null
 */
export function resolveAddress(
  input: string,
  workspace: AddressWorkspace,
  currentHost: string,
): AddressAction | null {
  const text = input.trim();
  if (text === '') {
    return null;
  }
  if (text.startsWith('/')) {
    return { type: 'page', page: resolveBlogPath(text, text, workspace) };
  }
  const hasScheme = SCHEME_PATTERN.test(text);
  if (!hasScheme && !DOMAIN_PATTERN.test(text)) {
    return { type: 'page', page: { kind: 'search', query: text } };
  }
  const url = parseUrl(hasScheme ? text : `https://${text}`);
  if (url === null || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return { type: 'page', page: { kind: 'search', query: text } };
  }
  if (isBlogHost(url.host, currentHost)) {
    return { type: 'page', page: resolveBlogPath(url.pathname, text, workspace) };
  }
  return { type: 'external', url: url.href };
}

/**
 * 입력 중인 글자의 추천 목록. 제목이 [[검색:일치 규칙]]에 맞는 글(휴지통에 든 글은 뺀다)을 일치 단계 차례로 몇 개 두고,
 * 끝에 그 글자로 검색하는 줄을 둔다.
 * @codocs [[Chrome:주소창]]
 * @codocs [[검색:일치 규칙]]
 * @param workspace 작업 공간
 * @param query 입력 중인 글자
 * @returns 추천. 글자가 비었으면 빈 목록
 */
export function getAddressSuggestions(
  workspace: AddressWorkspace,
  query: string,
): AddressSuggestionTarget[] {
  const text = query.trim();
  if (text === '') {
    return [];
  }
  const posts = searchPosts(workspace, text).slice(0, ADDRESS_SUGGESTION_POST_LIMIT);
  return [
    ...posts.map(
      /**
       * 글 하나의 추천 줄을 만든다.
       * @param post 글
       * @returns 추천 줄
       */
      (post): AddressSuggestionTarget => ({
        kind: 'post',
        title: post.name,
        url: getPostAddress(post.slug),
        page: { kind: 'post', slug: post.slug },
      }),
    ),
    { kind: 'search', title: `${text} 검색`, page: { kind: 'search', query: text } },
  ];
}

/**
 * 제목에 검색어가 든 글(휴지통에 든 글은 뺀다)을 [[검색:일치 규칙]]의 차례로 돌려준다. 검색 결과 페이지에 쓴다.
 * @codocs [[Chrome:주소창]]
 * @codocs [[검색:일치 규칙]]
 * @param workspace 작업 공간
 * @param query 검색어
 * @returns 글
 */
export function searchPosts(workspace: AddressWorkspace, query: string): PostItem[] {
  const posts = Object.values(workspace.items).filter(
    (item): item is PostItem => item.kind === 'post' && !isItemInTrash(workspace, item.id),
  );
  return rankItems(posts, query).filter((item): item is PostItem => item.kind === 'post');
}

/**
 * 블로그 안의 경로로 갈 페이지를 정한다.
 * @param path 경로
 * @param typed 입력한 글자(찾을 수 없음 화면에 보인다)
 * @param workspace 작업 공간
 * @returns 페이지
 */
function resolveBlogPath(path: string, typed: string, workspace: AddressWorkspace): ChromeTabPage {
  const pathname = path.replace(/[?#].*$/u, '');
  if (pathname === '' || pathname === '/') {
    return { kind: 'new-tab' };
  }
  const encodedSlug = POST_PATH_PATTERN.exec(pathname)?.[1];
  const slug = encodedSlug === undefined ? null : decodeSlug(encodedSlug);
  if (slug !== null && workspace.items[getPostItemId(slug)]?.kind === 'post') {
    return { kind: 'post', slug };
  }
  return { kind: 'not-found', url: typed };
}

/**
 * 블로그 호스트인지 본다.
 * @param host 주소의 호스트
 * @param currentHost 지금 블로그가 열린 호스트
 * @returns 블로그 호스트면 true
 */
function isBlogHost(host: string, currentHost: string): boolean {
  const name = host.toLowerCase();
  return name === BLOG_HOST || name === `${WWW_PREFIX}${BLOG_HOST}` || name === currentHost;
}

/**
 * 주소를 읽는다.
 * @param text 주소
 * @returns 읽은 주소. 주소 꼴이 아니면 null
 */
function parseUrl(text: string): URL | null {
  return URL.canParse(text) ? new URL(text) : null;
}

/**
 * 주소에 인코딩된 slug를 푼다.
 * @param encoded 인코딩된 slug
 * @returns slug. 풀 수 없으면 null
 */
function decodeSlug(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

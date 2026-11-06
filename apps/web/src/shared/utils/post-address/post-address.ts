// 글이 속한 묶음(Blog·Project·About)과 묶음별 글 주소(`/posts/<slug>`, `/projects/<slug>`, `/about/<slug>`)의 규칙이다.
// 서버(`app/`, `content/`)와 브라우저(주소창, 브라우저 주소, 링크 복사)가 같은 규칙으로 주소를 만들고 읽는다.

/**
 * 글 묶음. Notion 데이터베이스 하나가 묶음 하나다(`blog`, `project`, `about`).
 * @codocs [[콘텐츠 원천:데이터베이스]]
 */
export const POST_COLLECTIONS = ['blog', 'project', 'about'] as const;

/** 글 묶음 */
export type PostCollection = (typeof POST_COLLECTIONS)[number];

/** 글 하나를 가리키는 값. slug는 같은 묶음 안에서만 유일하므로 묶음과 함께 쓴다 */
export type PostRef = {
  collection: PostCollection;
  slug: string;
};

/**
 * 묶음별 글 주소의 첫 마디.
 * @codocs [[Chrome:글 주소]]
 */
export const postPathSegments = {
  blog: 'posts',
  project: 'projects',
  about: 'about',
} as const satisfies Record<PostCollection, string>;

// 글 주소의 경로(`/<첫 마디>/<slug>`)다. 끝의 `/`는 받는다.
const POST_PATH_PATTERN = /^\/([^/]+)\/([^/]+)\/?$/u;

/**
 * 글의 경로. slug는 인코딩한다. 예: `/posts/react-19-hooks`, `/projects/this-blog`
 * @codocs [[Chrome:글 주소]]
 * @param post 글
 * @returns 경로
 */
export function getPostPath(post: PostRef): string {
  return `/${postPathSegments[post.collection]}/${encodeURIComponent(post.slug)}`;
}

/**
 * 경로가 글 주소면 그 글을 돌려준다. 묶음 경로만(`/posts`)이거나 다른 경로면 null이다.
 * @codocs [[Chrome:글 주소]]
 * @param pathname 경로(쿼리와 해시는 뺀 것)
 * @returns 글. 글 주소가 아니면 null
 */
export function parsePostPath(pathname: string): PostRef | null {
  const match = POST_PATH_PATTERN.exec(pathname);
  if (match === null) {
    return null;
  }
  const [, segment, encodedSlug] = match;
  const collection = POST_COLLECTIONS.find((candidate) => postPathSegments[candidate] === segment);
  const slug = encodedSlug === undefined ? null : decodePathSegment(encodedSlug);
  return collection === undefined || slug === null ? null : { collection, slug };
}

/**
 * 두 값이 같은 글을 가리키는지 본다.
 * @param left 글
 * @param right 글
 * @returns 같은 글이면 true
 */
export function isSamePost(left: PostRef, right: PostRef): boolean {
  return left.collection === right.collection && left.slug === right.slug;
}

/**
 * 주소에 인코딩된 마디를 푼다.
 * @param encoded 인코딩된 마디
 * @returns 푼 마디. 풀 수 없으면 null
 */
function decodePathSegment(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

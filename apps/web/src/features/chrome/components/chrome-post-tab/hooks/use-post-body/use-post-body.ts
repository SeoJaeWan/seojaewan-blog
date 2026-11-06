import { useEffect, useState } from 'react';

import { getPostPath, type PostRef } from '@/shared/utils/post-address/post-address';
import { type PostBody, postBodySchema } from '@/shared/utils/post-body/post-body';

/** 글 본문을 받는 상태. 받는 중, 받음, 받지 못함이다 */
export type PostBodyState =
  { status: 'loading' } | { status: 'loaded'; body: PostBody } | { status: 'failed' };

// 받은 본문을 본문 경로마다 기억한다. 작업 표시줄 미리보기·Snap Assist가 같은 글 탭을 여러 번 그려도 한 번만 받는다.
const bodyRequests = new Map<string, Promise<PostBody | null>>();

// 받는 중 상태다.
const LOADING_STATE = { status: 'loading' } as const;

/**
 * 글 본문을 서버 경로(`/api` 뒤에 글 경로를 붙인 `/api/posts/<slug>`, `/api/projects/<slug>`, `/api/about/<slug>`)에서 받는다. 본문은 서버에서만 읽으므로 브라우저는 이 경로로만 받는다.
 * 받은 JSON은 본문 스키마로 검증한다. 받는 중에는 loading, 없거나 검증에 실패하면 failed다.
 * 서버가 그리며 넘긴 본문(글 주소로 처음 들어온 글, props로 받는다)이 있으면 받지 않고 처음 렌더부터 loaded다. 서버 HTML에 본문이 들어간다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[Chrome:글 화면]]
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param post 글(묶음과 slug)
 * @param preloadedBody 서버가 읽어 넘긴 이 글의 본문. 있으면 받지 않는다
 * @returns 본문을 받는 상태
 */
export function usePostBody(post: PostRef, preloadedBody?: PostBody): PostBodyState {
  const [result, setResult] = useState<{ path: string; state: PostBodyState } | null>(null);
  const isPreloaded = preloadedBody !== undefined;
  const path = getPostBodyPath(post);

  useEffect(
    /** 본문을 받아 상태에 둔다. 다른 글로 바뀌면 앞의 결과는 버린다. 서버가 넘긴 본문이 있으면 받지 않는다. */
    () => {
      if (isPreloaded) {
        return undefined;
      }
      let isCurrent = true;
      loadPostBody(path)
        .then(
          /**
           * 받은 본문을 상태에 둔다. 그새 다른 글로 바뀌었으면 버린다.
           * @param body 본문. 받지 못했으면 null
           */
          (body) => {
            if (isCurrent) {
              setResult({
                path,
                state: body === null ? { status: 'failed' } : { status: 'loaded', body },
              });
            }
          },
        )
        .catch(ignoreLoadError);
      return () => {
        isCurrent = false;
      };
    },
    [path, isPreloaded],
  );

  if (preloadedBody !== undefined) {
    return { status: 'loaded', body: preloadedBody };
  }
  return result?.path === path ? result.state : LOADING_STATE;
}

/**
 * 글 본문을 받는 서버 경로. `/api` 뒤에 글 경로를 붙인다.
 * @codocs [[Chrome:글 주소]]
 * @param post 글
 * @returns 본문 경로. 예: `/api/projects/this-blog`
 */
export function getPostBodyPath(post: PostRef): string {
  return `/api${getPostPath(post)}`;
}

/**
 * 받아 둔 본문을 지운다(테스트).
 */
export function clearPostBodyCache(): void {
  bodyRequests.clear();
}

/**
 * 글 본문을 받는다. 같은 글은 한 번만 받고, 받지 못했으면 다음에 다시 받는다.
 * @param path 본문 경로
 * @returns 본문. 없거나 받지 못했으면 null
 */
function loadPostBody(path: string): Promise<PostBody | null> {
  const cached = bodyRequests.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const request = fetchPostBody(path).then(
    /**
     * 받지 못했으면 기억에서 지워 다음에 다시 받게 한다.
     * @param body 본문. 받지 못했으면 null
     * @returns 본문
     */
    (body) => {
      if (body === null) {
        bodyRequests.delete(path);
      }
      return body;
    },
  );
  bodyRequests.set(path, request);
  return request;
}

/**
 * 서버 경로에서 본문을 받아 검증한다.
 * @param path 본문 경로
 * @returns 본문. 없거나 받지 못했거나 모양이 다르면 null
 */
async function fetchPostBody(path: string): Promise<PostBody | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    const parsed = postBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** 본문을 받지 못한 것은 failed 상태로 이미 다루므로 넘어간다. */
function ignoreLoadError(): void {}

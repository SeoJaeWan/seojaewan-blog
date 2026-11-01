import { useEffect, useState } from 'react';

import { type PostBlock, postBodySchema } from '@/shared/utils/post-body/post-body';

/** 글 본문을 받는 상태. 받는 중, 받음, 받지 못함이다 */
export type PostBodyState =
  { status: 'loading' } | { status: 'loaded'; blocks: readonly PostBlock[] } | { status: 'failed' };

// 받은 본문을 slug마다 기억한다. 작업 표시줄 미리보기·Snap Assist가 같은 글 탭을 여러 번 그려도 한 번만 받는다.
const bodyRequests = new Map<string, Promise<readonly PostBlock[] | null>>();

// 받는 중 상태다.
const LOADING_STATE = { status: 'loading' } as const;

/**
 * 글 본문을 서버 경로(`/api/posts/<slug>`)에서 받는다. 본문은 서버에서만 읽으므로 브라우저는 이 경로로만 받는다.
 * 받은 JSON은 본문 스키마로 검증한다. 받는 중에는 loading, 없거나 검증에 실패하면 failed다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[Chrome:글 화면]]
 * @param slug 글 slug
 * @returns 본문을 받는 상태
 */
export function usePostBody(slug: string): PostBodyState {
  const [result, setResult] = useState<{ slug: string; state: PostBodyState } | null>(null);

  useEffect(
    /** 본문을 받아 상태에 둔다. 다른 글로 바뀌면 앞의 결과는 버린다. */
    () => {
      let isCurrent = true;
      loadPostBody(slug)
        .then(
          /**
           * 받은 본문을 상태에 둔다. 그새 다른 글로 바뀌었으면 버린다.
           * @param blocks 본문 블록. 받지 못했으면 null
           */
          (blocks) => {
            if (isCurrent) {
              setResult({
                slug,
                state: blocks === null ? { status: 'failed' } : { status: 'loaded', blocks },
              });
            }
          },
        )
        .catch(ignoreLoadError);
      return () => {
        isCurrent = false;
      };
    },
    [slug],
  );

  return result?.slug === slug ? result.state : LOADING_STATE;
}

/**
 * 받아 둔 본문을 지운다(테스트).
 */
export function clearPostBodyCache(): void {
  bodyRequests.clear();
}

/**
 * 글 본문을 받는다. 같은 글은 한 번만 받고, 받지 못했으면 다음에 다시 받는다.
 * @param slug 글 slug
 * @returns 본문 블록. 없거나 받지 못했으면 null
 */
function loadPostBody(slug: string): Promise<readonly PostBlock[] | null> {
  const cached = bodyRequests.get(slug);
  if (cached !== undefined) {
    return cached;
  }
  const request = fetchPostBody(slug).then(
    /**
     * 받지 못했으면 기억에서 지워 다음에 다시 받게 한다.
     * @param blocks 본문 블록. 받지 못했으면 null
     * @returns 본문 블록
     */
    (blocks) => {
      if (blocks === null) {
        bodyRequests.delete(slug);
      }
      return blocks;
    },
  );
  bodyRequests.set(slug, request);
  return request;
}

/**
 * 서버 경로에서 본문을 받아 검증한다.
 * @param slug 글 slug
 * @returns 본문 블록. 없거나 받지 못했거나 모양이 다르면 null
 */
async function fetchPostBody(slug: string): Promise<readonly PostBlock[] | null> {
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }
    const parsed = postBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data.blocks : null;
  } catch {
    return null;
  }
}

/** 본문을 받지 못한 것은 failed 상태로 이미 다루므로 넘어간다. */
function ignoreLoadError(): void {}

import type { NextConfig } from 'next';

// Next.js가 "끝없음"으로 쓰는 캐시 시간(초)이다. `cacheLife` 기본 수명의 expire와 같은 값이다.
const NEVER_SECONDS = 0xfffffffe;

const nextConfig: NextConfig = {
  // @codocs [[코드 작성 규칙:React와 Next.js]]
  reactCompiler: true,
  // @codocs [[콘텐츠 원천:갱신 방식]]
  // Notion 글 색인과 본문을 `'use cache'`와 캐시 태그로 캐시하고, 웹훅이 `revalidateTag`로 바뀐 것만 다시 만든다.
  cacheComponents: true,
  partialPrefetching: false,
  cacheLife: {
    // 시간으로 다시 만들지 않는다. 웹훅이나 다시 배포할 때만 새로 읽는다.
    content: { revalidate: NEVER_SECONDS, expire: NEVER_SECONDS },
  },
  transpilePackages: ['@seojaewan/design-system'],
};

export default nextConfig;

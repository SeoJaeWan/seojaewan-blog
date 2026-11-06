import type { NextConfig } from 'next';

// Next.js가 "끝없음"으로 쓰는 캐시 시간(초)이다. `cacheLife` 기본 수명의 expire와 같은 값이다.
const NEVER_SECONDS = 0xfffffffe;

const nextConfig: NextConfig = {
  // @codocs [[코드 작성 규칙:React와 Next.js]]
  reactCompiler: true,
  // @codocs [[콘텐츠 원천:갱신 방식]]
  // Notion 글 색인과 본문을 `'use cache'`와 캐시 태그로 캐시하고, 웹훅이 `revalidateTag`로 바뀐 것만 다시 만든다.
  cacheComponents: true,
  // 켜면 빌드 때 만들지 않은 slug에 미리 만든 빈 틀을 200으로 먼저 보내, 공개하지 않은 항목 주소가 404로 답하지 못한다.
  partialPrefetching: false,
  cacheLife: {
    // 시간으로 다시 만들지 않는다. 웹훅이나 다시 배포할 때만 새로 읽는다.
    content: { revalidate: NEVER_SECONDS, expire: NEVER_SECONDS },
  },
  // 빌드 때 여러 페이지가 함께 Notion을 읽어 요청 제한(429)으로 기다리면, 블록이 많은 글은 기본 60초를 넘길 수 있다.
  // 캐시 함수의 제한 시간도 이 값의 90%를 따른다.
  staticPageGenerationTimeout: 180,
  transpilePackages: ['@seojaewan/design-system'],
};

export default nextConfig;

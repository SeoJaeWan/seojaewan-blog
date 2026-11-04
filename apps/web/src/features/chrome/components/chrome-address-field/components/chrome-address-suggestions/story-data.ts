// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Chrome 주소창 추천 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

import type { AddressSuggestionTarget } from '@/features/chrome/utils/chrome-address/chrome-address';

/** 피그마 Chrome/AddressSuggestions: 주소창에 입력 중인 글자와 입력하면 여는 추천 목록 */
export const addressSuggestions = {
  query: '리액',
  /** 주소창 너비(px). 피그마 조립의 주소창 크기다 */
  width: 640,
  items: [
    {
      kind: 'post',
      title: '리액트 19 훅 정리',
      url: 'seojaewan.com/posts/react-19-hooks',
      page: { kind: 'post', slug: 'react-19-hooks' },
    },
    {
      kind: 'post',
      title: '리액트 서버 컴포넌트 이해하기',
      url: 'seojaewan.com/posts/react-server-components',
      page: { kind: 'post', slug: 'react-server-components' },
    },
    { kind: 'search', title: '리액트 검색', page: { kind: 'search', query: '리액' } },
  ],
} as const satisfies { query: string; width: number; items: readonly AddressSuggestionTarget[] };

import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getSiteMetadata } from '@/content/site-metadata/site-metadata';

// @codocs [[SEO와 공유 미리보기:메타 정보]]
export const metadata: Metadata = getSiteMetadata();

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * 모든 라우트가 공유하는 html·body 뼈대를 그린다.
 * `html`과 `body`에 바탕색(재부팅 화면과 같은 검정)을 두어, 화면이 늘어나는 순간에도 흰 여백이 보이지 않게 한다.
 * @codocs [[반응형:화면 채우기]]
 * @param props 컴포넌트 속성
 * @param props.children 레이아웃 안에 그릴 라우트 내용
 * @returns 루트 레이아웃
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="ko" className="bg-color-black">
      <body className="bg-color-black">{children}</body>
    </html>
  );
}

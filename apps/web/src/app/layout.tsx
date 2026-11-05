import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'seojaewan',
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * 모든 라우트가 공유하는 html·body 뼈대를 그린다.
 * @param props 컴포넌트 속성
 * @param props.children 레이아웃 안에 그릴 라우트 내용
 * @returns 루트 레이아웃
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

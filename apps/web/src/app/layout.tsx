import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'seojaewan',
};

type RootLayoutProps = {
  /** 레이아웃 안에 그릴 라우트 내용 */
  children: ReactNode;
};

/**
 * 모든 라우트가 공유하는 html·body 뼈대를 그린다.
 * @param props
 * @returns 루트 레이아웃
 */
export default function RootLayout(props: RootLayoutProps): ReactNode {
  return (
    <html lang="ko">
      <body>{props.children}</body>
    </html>
  );
}

import type { ReactNode } from 'react';

import { Shell } from '@/shell/shell';

/**
 * 홈 화면이다. 앱 화면 전체(shell)를 그린다.
 * @returns 홈 화면
 */
export default function HomePage(): ReactNode {
  return <Shell />;
}

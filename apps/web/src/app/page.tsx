import type { ReactNode } from 'react';

import { Workspace } from '@/features/desktop/desktop';

/**
 * 홈 화면이다. 앱 화면 전체(작업 공간)를 그린다.
 * @returns 홈 화면
 */
export default function HomePage(): ReactNode {
  return <Workspace />;
}

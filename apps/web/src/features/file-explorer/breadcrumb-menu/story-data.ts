// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 경로 꺾쇠 목록(Explorer/BreadcrumbMenu) 스토리의 고정 데이터다. 피그마 조립과 같은 값을 둔다.

import type { BreadcrumbMenuTarget } from './breadcrumb-menu-entries';

/** 피그마 Explorer/BreadcrumbMenu의 경로 마디 이름. 마지막 마디(Blog) 뒤 꺾쇠가 열려 있다 */
export const BREADCRUMB_MENU_TRAIL = ['바탕 화면', 'Blog'] as const;

/** 피그마 Explorer/BreadcrumbMenu 목록의 Blog 하위 폴더(위에서부터) */
export const breadcrumbMenuTargets: readonly BreadcrumbMenuTarget[] = [
  { location: 'folder:React', name: 'React', icon: 'images/file-folder' },
  { location: 'folder:Next.js', name: 'Next.js', icon: 'images/file-folder' },
  { location: 'folder:TypeScript', name: 'TypeScript', icon: 'images/file-folder' },
];

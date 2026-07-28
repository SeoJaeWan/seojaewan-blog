import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

export type FolderSidebarUIProps = ComponentPropsWithoutRef<"ul">;

/**
 * 폴더 창 좌측 카테고리 트리 (원본 hidden @md:block w-1/6 사이드바).
 * 카테고리 선택/우클릭 메뉴는 각 FolderCategoryItemUI이 앱에 위임하고,
 * 이 컴포넌트는 탐색기 본문 안의 sidebar list 영역만 제공한다.
 *
 * @param props.children 사이드바에 표시할 FolderCategoryItemUI 목록
 * @param props.className sidebar root에 추가할 className
 */
export const FolderSidebarUI = ({ children, className, ...props }: FolderSidebarUIProps) => (
  <ul className={clsx("wb-folder-sidebar", className)} {...props}>
    {children}
  </ul>
);

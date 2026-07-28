import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { clsx } from "clsx";

export interface FolderViewerUIProps extends ComponentPropsWithoutRef<"section"> {
  /** 카테고리 트리 사이드바 slot (FolderSidebarUI, 창 폭 @md 이상에서만 표시) */
  sidebar?: ReactNode;
}

/**
 * 폴더 창 본문 레이아웃 (원본 FolderViewerUI).
 * 흰 배경 탐색기 영역으로, 사이드바 + 파일 카드 그리드(children)를 배치한다.
 * 카테고리/파일/정렬 context menu 조립은 앱 레이어 몫이다.
 *
 * @param props.sidebar 좌측 카테고리 트리 slot. 보통 FolderSidebarUI를 전달한다
 * @param props.children 우측 파일 카드 그리드 또는 폴더 본문 콘텐츠
 * @param props.className viewer root에 추가할 className
 */
export const FolderViewerUI = ({ children, className, sidebar, ...props }: FolderViewerUIProps) => (
  <section className={clsx("wb-folder-viewer", className)} {...props}>
    {sidebar}
    {children}
  </section>
);

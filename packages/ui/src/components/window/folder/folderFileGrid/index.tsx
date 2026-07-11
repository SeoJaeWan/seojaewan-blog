import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

/** 폴더/데스크톱 항목의 카드 또는 아이콘 크기 variant. */
export type FolderViewMode = "big" | "middle" | "small";

export interface FolderFileGridProps extends ComponentPropsWithoutRef<"div"> {
  /** 카드 폭: big 320px / middle 240px / small 160px (원본 viewMode) */
  viewMode?: FolderViewMode;
}

/**
 * 폴더 창 우측 파일 카드 그리드 (원본 FolderViewer의 flex-wrap 영역).
 * 파일 카드 배치와 viewMode별 폭만 소유하고, 빈 영역 우클릭(정렬 메뉴)은 onContextMenu로 위임한다.
 *
 * @param props.children 그리드에 배치할 FolderFileCard 목록
 * @param props.viewMode 카드 폭 variant. 기본값은 "middle"
 * @param props.className grid root에 추가할 className
 */
export const FolderFileGrid = ({
  children,
  className,
  viewMode = "middle",
  ...props
}: FolderFileGridProps) => (
  <div className={clsx("wb-folder-file-grid", className)} data-view={viewMode} {...props}>
    {children}
  </div>
);

import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

import type { FolderViewMode } from "../../window/folder/folderFileGridUI";

/** FolderViewMode와 같은 값 — 원본 windows 키 리스트 컨트롤과 체계를 공유한다 */
export type DesktopViewMode = FolderViewMode;

export interface DesktopIconGridUIProps extends ComponentPropsWithoutRef<"div"> {
  /** 아이콘 버튼 크기: big 112px / middle 96px / small 80px (원본 viewMode) */
  viewMode?: DesktopViewMode;
}

/**
 * 바탕화면 아이콘 배치 레이어 (원본 WallPaper의 아이콘 영역).
 * Windows처럼 좌측부터 세로로 쌓이고 넘치면 다음 열로 감싼다.
 * hydration 가드(mounted 후 렌더)는 앱 책임이다.
 *
 * @param props.children 배치할 DesktopIconUI 목록
 * @param props.viewMode 아이콘 버튼 크기 variant. 기본값은 "middle"
 * @param props.className icon grid root에 추가할 className
 */
export const DesktopIconGridUI = ({
  children,
  className,
  viewMode = "middle",
  ...props
}: DesktopIconGridUIProps) => (
  <div className={clsx("wb-desktop-icon-grid", className)} data-view={viewMode} {...props}>
    {children}
  </div>
);

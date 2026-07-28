import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

export interface WallpaperUIProps extends ComponentPropsWithoutRef<"div"> {
  /** 배경 이미지 URL (원본 /images/windows.webp) — 없으면 gray-100 fallback */
  backgroundSrc?: string;
}

/**
 * 바탕화면 배경 surface (원본 WallPaper의 배경 부분).
 * 앱 root에서 taskbar 50px을 제외한 영역을 채우는 데스크톱 바닥이 된다 —
 * 아이콘 배치는 자식 DesktopIconGridUI가, 창(WindowFrameUI)은 형제로 렌더한다.
 * 빈 영역 우클릭(정렬/보기 메뉴)은 onContextMenu로 앱에 위임한다.
 *
 * @param props.backgroundSrc 배경 이미지 URL. 없으면 CSS fallback 배경을 사용한다
 * @param props.children 바탕화면 위에 배치할 icon grid 등 콘텐츠
 * @param props.className wallpaper root에 추가할 className
 */
export const WallpaperUI = ({
  backgroundSrc,
  children,
  className,
  style,
  ...props
}: WallpaperUIProps) => (
  <div
    className={clsx("wb-wallpaper", className)}
    style={backgroundSrc ? { backgroundImage: `url(${backgroundSrc})`, ...style } : style}
    {...props}
  >
    {children}
  </div>
);

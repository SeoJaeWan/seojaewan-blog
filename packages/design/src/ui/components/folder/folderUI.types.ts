import type { ComponentPropsWithRef, ReactNode } from "react";

import type { WindowFrameUIProps, WindowTitleBarUIProps } from "../window";

/** Window chrome 위에 folder title slots와 renderable body를 조합하는 props다. */
export interface FolderFrameUIProps extends Omit<WindowFrameUIProps, "children" | "titleBar"> {
  /** titlebar 오른쪽에 배치할 접근 가능한 control slot이다. */
  controls?: ReactNode;
  /** title 앞에 배치할 장식 또는 application icon slot이다. */
  leading?: ReactNode;
  /** folder viewer 등 이미 render 가능한 본문 slot이다. */
  children?: ReactNode;
  /** titlebar의 native header props다. 구성 slot은 최상위 props가 소유한다. */
  titleBarProps?: Omit<WindowTitleBarUIProps, "children" | "controls" | "leading" | "titleContent">;
  /** titlebar에 표시할 renderable display value다. */
  titleContent?: ReactNode;
}

/** FolderViewerUI의 sidebar/content slots와 native section props를 정의한다. */
export interface FolderViewerUIProps extends ComponentPropsWithRef<"section"> {
  /** children 대신 본문 grid에 배치할 renderable content slot이다. */
  contentSlot?: ReactNode;
  /** 넓은 local container에서만 표시할 navigation slot이다. */
  sidebar?: ReactNode;
  /** sidebar complementary landmark의 선택적 접근 가능한 이름이다. */
  sidebarLabel?: string;
}

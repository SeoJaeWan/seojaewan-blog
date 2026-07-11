import type { ReactNode } from "react";

export interface WindowItem {
  /** 파일 위치 열기 대상 카테고리 */
  categoryId?: string;
  icon?: ReactNode;
  id: string;
  /** 작업 표시줄 고정 대상 앱 id. 없으면 작업 표시줄 고정 row를 숨긴다. */
  taskbarPinId?: string;
  title: string;
}

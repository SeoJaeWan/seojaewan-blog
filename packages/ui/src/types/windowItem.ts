import type { ReactNode } from "react";

export interface WindowItem {
  /** 제목 아래에 표시할 보조 설명. */
  description?: string;
  icon?: ReactNode;
  id: string;
  title: string;
}

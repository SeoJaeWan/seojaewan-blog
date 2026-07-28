import { useContext } from "react";

import { ContextMenuContext } from "../../context";

/**
 * 범용 Context Menu Provider가 제공한 open/close gateway를 읽는다.
 *
 * @returns 현재 Provider의 Context Menu gateway
 */
export const useContextMenuContext = () => {
  const context = useContext(ContextMenuContext);

  if (context === null) {
    throw new Error("useContextMenuTrigger는 ContextMenuProvider 안에서 사용해야 합니다.");
  }

  return context;
};

"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { ContextMenuUI } from "@window/ui";

import { useIsHydrated } from "../hooks/useIsHydrated";
import { ContextMenuContext } from "./context";
import { ContextMenuEntryList } from "./entryList";
import { useContextMenuValue } from "./hooks/useContextMenuValue";

export interface ContextMenuProviderProps {
  /** 전역 Context Menu를 사용할 shell과 앱 component. */
  children: ReactNode;
  /** Context Menu UI를 연결할 portal 대상. 기본값은 hydration 이후 document.body다. */
  portalContainer?: Element;
}

/**
 * Shell 전체가 공유하는 단일 Context Menu 상태와 Portal Host를 제공한다.
 * Action target과 도메인 동작은 consumer trigger hook의 설정이 소유한다.
 *
 * @param props.children Context Menu trigger를 사용하는 shell과 앱 component
 * @param props.portalContainer Context Menu UI를 연결할 선택 portal 대상
 */
export const ContextMenuProvider = ({ children, portalContainer }: ContextMenuProviderProps) => {
  const contextMenu = useContextMenuValue();
  const isHydrated = useIsHydrated();
  const resolvedPortalContainer = portalContainer ?? (isHydrated ? document.body : null);

  return (
    <ContextMenuContext.Provider value={contextMenu.contextValue}>
      {children}
      {contextMenu.activeMenu !== null && resolvedPortalContainer !== null
        ? createPortal(
            <ContextMenuUI
              animated={contextMenu.activeMenu.animated}
              menuRef={contextMenu.menuRef}
              onBackdropPointerDown={contextMenu.handleBackdropPointerDown}
              onKeyDown={contextMenu.handleMenuKeyDown}
              position={contextMenu.position}
            >
              <ContextMenuEntryList
                closeSubmenusFromDepth={contextMenu.closeSubmenusFromDepth}
                entries={contextMenu.entries}
                handleAction={contextMenu.handleAction}
                openSubmenu={contextMenu.openSubmenu}
                openSubmenuPath={contextMenu.openSubmenuPath}
              />
            </ContextMenuUI>,
            resolvedPortalContainer,
          )
        : null}
    </ContextMenuContext.Provider>
  );
};

export { useContextMenuTrigger } from "./hooks/useContextMenuTrigger";
export type {
  ContextMenuActionEntry,
  ContextMenuCloseReason,
  ContextMenuEntry,
  ContextMenuSeparatorEntry,
  ContextMenuSubmenuEntry,
  ContextMenuTriggerHandler,
  UseContextMenuTriggerOptions,
} from "./types";

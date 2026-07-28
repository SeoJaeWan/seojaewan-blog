"use client";

import { WindowPanelAllView } from "../allView";
import { WindowPanelPinnedView } from "../pinnedView";
import { useWindowPanelViewContext } from "../view/hooks/useWindowPanelViewContext";

/**
 * Pinned와 All Shell view를 고정된 순서로 함께 유지하고 slide layout만 조립한다.
 * 각 화면의 item, action, Context Menu와 지역 lifecycle은 child view가 소유한다.
 */
export const WindowPanelBrowseView = () => {
  const navigation = useWindowPanelViewContext();

  return (
    <div className="wb-windows-panel__views" data-view={navigation.view}>
      <WindowPanelPinnedView />
      <WindowPanelAllView />
    </div>
  );
};

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import {
  type ResourceRef,
  selectWorkspacePath,
  useHeadlessRuntime,
  useTaskbarSearchController,
} from "../../../../../../headless/index.js";
import type { TaskbarPanelConnection } from "../../../panels/connection/index.js";

/**
 * 두 검색 입력의 조합·debounce와 결과 탐색 DOM을 각 Surface 수명에 연결한다.
 * raw query는 복제하지 않고 현재 공개 controller의 적용 version과 입력 DOM만 조합한다.
 */
export const useTaskbarSearchOwner = (connection: TaskbarPanelConnection) => {
  const runtime = useHeadlessRuntime();
  const { viewModel, actions } = useTaskbarSearchController();
  const panel = connection.panel;
  const snapshot = viewModel.panels[panel];
  const [composing, setComposing] = useState(false);
  const compositionRef = useRef(false);
  const rows = useRef<HTMLButtonElement[]>([]);
  const active = useRef(-1);
  const detailOpener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    active.current = -1;
    if (!connection.widget.open) {
      compositionRef.current = false;
      setComposing(false);
    }
  }, [connection.query, connection.widget.open, snapshot.version]);

  useEffect(() => {
    if (!connection.widget.open || composing || !snapshot.pending) return;
    const timer = setTimeout(() => {
      void actions.execute({
        type: "search.apply-query",
        panel,
        query: connection.query,
        version: snapshot.version,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [
    actions,
    composing,
    connection.query,
    connection.widget.open,
    panel,
    snapshot.pending,
    snapshot.version,
  ]);

  /** 조합과 pending 중 실행을 막고 방향키 진입 뒤 focus·scroll을 함께 이동한다. */
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    const ime = compositionRef.current || event.nativeEvent.isComposing || event.keyCode === 229;
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    (event as typeof event & { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
    if (ime || snapshot.pending || snapshot.detail !== null || !viewModel.ready) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (active.current >= 0) rows.current[active.current]?.click();
      return;
    }
    event.preventDefault();
    const count = rows.current.length;
    if (count === 0) return;
    active.current = Math.max(
      0,
      Math.min(count - 1, active.current + (event.key === "ArrowDown" ? 1 : -1)),
    );
    const row = rows.current[active.current];
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "nearest" });
  };

  const readers = viewModel.ready ? runtime.search.getReaders() : null;
  /** 현재 Catalog에서 이름을 읽으며 삭제된 Resource는 빈 이름으로 표시 대상에서 제외한다. */
  const title = (resource: ResourceRef) =>
    resource.kind === "content"
      ? (readers?.content.get(resource.id)?.title ?? "")
      : resource.kind === "folder"
        ? (readers?.folder.get(resource.id)?.name ?? "")
        : (readers?.externalShortcut.get(resource.id)?.name ?? "");
  /** Resource의 canonical 주소 또는 현재 Workspace Folder 표시 경로를 읽는다. */
  const path = (resource: ResourceRef) => {
    if (resource.kind === "content")
      return `/content/${resource.id}/${readers?.content.get(resource.id)?.slug ?? ""}`;
    if (resource.kind === "external-shortcut")
      return readers?.externalShortcut.get(resource.id)?.url ?? "";
    const workspace = runtime.workspace.getSnapshot();
    return workspace.status === "ready"
      ? (selectWorkspacePath(workspace.snapshot, resource) ?? "")
      : "";
  };
  /** 실제 open 결과는 runtime에 맡기며 입력 조합·대기 중에는 Action을 보내지 않는다. */
  const open = (resource: ResourceRef, fileLocation = false) => {
    if (
      compositionRef.current ||
      runtime.search.getSnapshot().panels[panel].pending ||
      !viewModel.ready
    )
      return;
    void actions.execute({
      type: fileLocation ? "search.open-file-location" : "search.open-resource",
      panel,
      resource,
    });
  };
  /** detail만 닫고 기존 opener focus를 복원하며 목록 scroll을 변경하지 않는다. */
  const back = () => {
    void actions.execute({ type: "search.hide-detail", panel });
    detailOpener.current?.focus({ preventScroll: true });
  };
  /** 실행 가능한 현재 결과의 상세만 표시한다. */
  const showDetail = (resource: ResourceRef) => {
    if (compositionRef.current || runtime.search.getSnapshot().panels[panel].pending) return;
    void actions.execute({ type: "search.show-detail", panel, resource });
  };

  return {
    panel,
    viewModel,
    snapshot,
    rows,
    detailOpener,
    title,
    path,
    open,
    back,
    showDetail,
    blocked: snapshot.pending || composing || !viewModel.ready,
    inputProps: {
      onCompositionStart: () => {
        compositionRef.current = true;
        setComposing(true);
      },
      onCompositionEnd: () => {
        compositionRef.current = false;
        setComposing(false);
      },
      onKeyDown,
    },
    onRowKeyDown: onKeyDown,
    onRowFocus: (index: number) => {
      active.current = index;
    },
  };
};

export type TaskbarSearchOwner = ReturnType<typeof useTaskbarSearchOwner>;

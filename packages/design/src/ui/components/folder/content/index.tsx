import { type ReactNode, useEffect, useRef } from "react";

import { clsx } from "clsx";

import type {
  FileExplorerControllerActions,
  FileExplorerReadModel,
} from "../../../../headless/folders/index.js";
import type { FolderContentFocusTarget } from "../navigation/index.js";

import "./folderContent.css";

/** Content shell의 상태와 #34 item renderer slot을 받는 제품 입력이다. */
export type FolderContentProps = Readonly<{
  actions: FileExplorerControllerActions;
  children?: ReactNode;
  className?: string;
  empty: FileExplorerReadModel["empty"];
  error: FileExplorerReadModel["error"];
  /** navigation이 valid 주소 확정 뒤 사용할 focus target을 연결한다. */
  registerFocusTarget?: (target: FolderContentFocusTarget | null) => void;
}>;

/** normal/error/search-empty surface와 focus boundary만 렌더링하고 Resource item DOM은 slot에 맡긴다. */
export const FolderContent = ({
  actions,
  children,
  className,
  empty,
  error,
  registerFocusTarget,
}: FolderContentProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = Object.freeze({ focus: () => rootRef.current?.focus() });
    registerFocusTarget?.(target);
    return () => registerFocusTarget?.(null);
  }, [registerFocusTarget]);

  return (
    <div
      aria-label="폴더 내용"
      className={clsx("folder-content", className)}
      data-state={error !== null ? "error" : (empty ?? "normal")}
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          void actions.execute({ type: "file-explorer.selection.set", selection: [] });
        }
      }}
      ref={rootRef}
      role="region"
      tabIndex={0}
    >
      {error !== null ? (
        <div className="folder-content__message" role="alert">
          <strong>폴더를 찾을 수 없습니다.</strong>
          <span>{error.path}</span>
        </div>
      ) : empty === "search" ? (
        <div className="folder-content__message" role="status">
          검색 결과가 없습니다.
        </div>
      ) : empty === "folder" ? (
        <div className="folder-content__message" role="status">
          이 폴더는 비어 있습니다.
        </div>
      ) : (
        children
      )}
    </div>
  );
};

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type {
  FileExplorerControllerActions,
  FileExplorerReadModel,
} from "../../../../../../headless/folders/index.js";
import type { FolderContentFocusTarget } from "../../index.js";

type UseAddressEditorOptions = Readonly<{
  actions: FileExplorerControllerActions;
  address: string;
  contentFocusTarget?: FolderContentFocusTarget | null;
  error: FileExplorerReadModel["error"];
}>;

/**
 * 주소 입력 모드의 draft, focus, 제출 완료 생명주기를 소유한다.
 */
export const useAddressEditor = ({
  actions,
  address,
  contentFocusTarget,
  error,
}: UseAddressEditorOptions) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousErrorRef = useRef(error);

  useEffect(() => {
    if (!editing) setDraft(address);
  }, [address, editing]);

  useEffect(() => {
    if (previousErrorRef.current !== null && error === null) {
      setEditing(false);
      contentFocusTarget?.focus();
    }
    previousErrorRef.current = error;
  }, [contentFocusTarget, error]);

  useEffect(() => {
    if (submitted === null) return;
    setDraft(address);
    setEditing(false);
    setSubmitted(null);
    if (error === null) contentFocusTarget?.focus();
  }, [address, contentFocusTarget, error, submitted]);

  useLayoutEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  /**
   * 현재 주소를 draft로 복사하고 입력 모드를 시작한다.
   */
  const beginEditing = () => {
    setDraft(address);
    setEditing(true);
  };

  /**
   * draft를 버리고 breadcrumb 표시로 돌아간다.
   */
  const cancelEditing = () => {
    setDraft(address);
    setEditing(false);
  };

  /**
   * draft 주소를 headless controller에 제출한다.
   */
  const submitAddress = () => {
    const path = draft;
    setSubmitted(path);
    void actions.execute({ type: "file-explorer.navigation.submit-address", path });
  };

  return {
    beginEditing,
    cancelEditing,
    draft,
    editing,
    inputRef,
    setDraft,
    submitAddress,
    submitted,
  } as const;
};

import { type CSSProperties, type FormEvent, useEffect, useRef } from "react";

import { Folder16Filled } from "@fluentui/react-icons";

import type { InlineDraft } from "../utils/inlineEdit/index.js";

type InlineEditorProps = Readonly<{
  draft: InlineDraft;
  depth: number;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
}>;

/**
 * Create와 rename에 같은 전체 선택, 확정, 취소, 오류 DOM을 제공한다.
 */
export const InlineEditor = ({ draft, depth, onCancel, onChange, onSubmit }: InlineEditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    if (draft.error !== null) inputRef.current?.focus();
  }, [draft.error]);

  /**
   * Form 기본 이동을 막고 제출 중이 아닐 때만 변경을 확정한다.
   */
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!draft.submitting) onSubmit();
  };

  return (
    <form
      className="file-explorer-sidebar__editor"
      data-inline-edit={draft.kind}
      onBlur={(event) => {
        if (!draft.submitting && !event.currentTarget.contains(event.relatedTarget)) onCancel();
      }}
      onSubmit={submit}
      style={{ "--wd-file-explorer-sidebar-depth": depth } as CSSProperties}
    >
      <span aria-hidden="true" className="file-explorer-sidebar__editor-spacer" />
      <Folder16Filled aria-hidden="true" className="file-explorer-sidebar__icon" />
      <input
        aria-disabled={draft.submitting ? true : undefined}
        aria-invalid={draft.error === null ? undefined : true}
        aria-label={draft.kind === "create" ? "새 폴더 이름" : "폴더 이름 바꾸기"}
        className="file-explorer-sidebar__input"
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            if (!draft.submitting) onSubmit();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
        readOnly={draft.submitting}
        ref={inputRef}
        value={draft.value}
      />
      {draft.error === null ? null : (
        <span className="file-explorer-sidebar__error" role="alert">
          {draft.error}
        </span>
      )}
    </form>
  );
};

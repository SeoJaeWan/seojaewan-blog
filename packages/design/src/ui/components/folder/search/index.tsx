import { useEffect, useRef, useState } from "react";

import { Input } from "@base-ui/react/input";
import { Search20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";

import "./folderSearch.css";

/** File Explorer search input의 controlled 제품 입력이다. */
export type FolderSearchProps = Readonly<{
  actions: FileExplorerControllerActions;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  query: string;
}>;

/** raw input을 보존하고 IME 확정값만 controller query Action으로 전달한다. */
export const FolderSearch = ({
  actions,
  className,
  disabled = false,
  placeholder = "현재 폴더 검색",
  query,
}: FolderSearchProps) => {
  const [rawValue, setRawValue] = useState(query);
  const composingRef = useRef(false);
  const lastCommittedRef = useRef(query);

  useEffect(() => {
    lastCommittedRef.current = query;
    if (!composingRef.current) setRawValue(query);
  }, [query]);

  const commit = (value: string) => {
    if (lastCommittedRef.current === value) return;
    lastCommittedRef.current = value;
    void actions.execute({ type: "file-explorer.query.set", query: value });
  };

  return (
    <label
      className={clsx("folder-search", className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <Search20Regular aria-hidden="true" className="folder-search__icon" />
      <Input
        aria-label="현재 폴더 검색"
        className="folder-search__input"
        disabled={disabled}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          const value = event.currentTarget.value;
          setRawValue(value);
          commit(value);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onFocus={() => void actions.execute({ type: "file-explorer.selection.set", selection: [] })}
        onValueChange={(value) => {
          setRawValue(value);
          if (!composingRef.current) commit(value);
        }}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={rawValue}
      />
    </label>
  );
};

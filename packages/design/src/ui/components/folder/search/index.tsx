import { Input } from "@base-ui/react/input";
import { Search20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { FileExplorerControllerActions } from "../../../../headless/folders/index.js";
import { useFolderSearchInput } from "./hooks/useFolderSearchInput/index.js";

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
  const { changeValue, endComposition, rawValue, startComposition } = useFolderSearchInput({
    actions,
    query,
  });

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
          endComposition(event.currentTarget.value);
        }}
        onCompositionStart={startComposition}
        onFocus={() => void actions.execute({ type: "file-explorer.selection.set", selection: [] })}
        onValueChange={changeValue}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={rawValue}
      />
    </label>
  );
};

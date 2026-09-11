import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowClockwise20Regular,
  ChevronLeft20Regular,
  ChevronRight16Regular,
  ChevronRight20Regular,
  MoreHorizontal20Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  FileExplorerControllerActions,
  FileExplorerReadModel,
} from "../../../../headless/folders/index.js";
import type { WorkspaceBreadcrumbItem } from "../../../../headless/workspace/index.js";
import { useAddressEditor } from "./hooks/useAddressEditor/index.js";
import {
  type AddressBreadcrumbItem,
  createUnresolvedBreadcrumb,
  splitBreadcrumb,
} from "./utils/breadcrumb/index.js";

import "./folderNavigation.css";

/** 유효한 주소 확정 뒤 Content로 focus를 옮기는 DOM 비종속 경계다. */
export type FolderContentFocusTarget = Readonly<{ focus(): void }>;

/** navigation row와 address의 controlled 제품 입력이다. */
export type FolderNavigationProps = Readonly<{
  actions: FileExplorerControllerActions;
  address: string;
  breadcrumb: readonly WorkspaceBreadcrumbItem[];
  canGoBack: boolean;
  canGoForward: boolean;
  className?: string;
  contentFocusTarget?: FolderContentFocusTarget | null;
  error: FileExplorerReadModel["error"];
}>;

/** File Explorer의 history controls와 editable address/breadcrumb를 직접 조합한다. */
export const FolderNavigation = ({
  actions,
  address,
  breadcrumb,
  canGoBack,
  canGoForward,
  className,
  contentFocusTarget,
  error,
}: FolderNavigationProps) => {
  const {
    beginEditing,
    cancelEditing,
    draft,
    editing,
    inputRef,
    setDraft,
    submitAddress,
    submitted,
  } = useAddressEditor({ actions, address, contentFocusTarget, error });
  const parts = splitBreadcrumb(error === null ? breadcrumb : createUnresolvedBreadcrumb(address));
  const showInput = editing;

  const navigate = (item: AddressBreadcrumbItem) => {
    void actions.execute(
      item.location === undefined
        ? { type: "file-explorer.navigation.submit-address", path: item.path }
        : { type: "file-explorer.navigation.navigate", location: item.location },
    );
  };

  const renderSegment = (item: AddressBreadcrumbItem, current: boolean) => (
    <span className="folder-navigation__segment" key={item.path}>
      {current ? (
        <span aria-current="page" className="folder-navigation__current" title={item.path}>
          {item.name}
        </span>
      ) : (
        <Button
          className="folder-navigation__breadcrumb-button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(item);
          }}
          title={item.path}
          type="button"
        >
          {item.name}
        </Button>
      )}
      {!current ? <ChevronRight16Regular aria-hidden="true" /> : null}
    </span>
  );

  return (
    <nav aria-label="파일 탐색기 탐색" className={clsx("folder-navigation", className)}>
      <div aria-label="탐색 기록" className="folder-navigation__history" role="group">
        <Button
          aria-label="뒤로"
          className="folder-navigation__control"
          disabled={!canGoBack}
          onClick={() => void actions.execute({ type: "file-explorer.navigation.back" })}
          type="button"
        >
          <ChevronLeft20Regular aria-hidden="true" />
        </Button>
        <Button
          aria-label="앞으로"
          className="folder-navigation__control"
          disabled={!canGoForward}
          onClick={() => void actions.execute({ type: "file-explorer.navigation.forward" })}
          type="button"
        >
          <ChevronRight20Regular aria-hidden="true" />
        </Button>
        <Button
          aria-label="새로 고침"
          className="folder-navigation__control"
          onClick={() => void actions.execute({ type: "file-explorer.navigation.refresh" })}
          type="button"
        >
          <ArrowClockwise20Regular aria-hidden="true" />
        </Button>
      </div>

      {showInput ? (
        <form
          aria-label="주소 입력"
          className="folder-navigation__address-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitAddress();
          }}
        >
          <Input
            aria-invalid={error !== null ? "true" : undefined}
            aria-label="주소"
            className="folder-navigation__address-input"
            onBlur={() => {
              if (submitted === null) cancelEditing();
            }}
            onFocus={() =>
              void actions.execute({ type: "file-explorer.selection.set", selection: [] })
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            onValueChange={setDraft}
            ref={inputRef}
            spellCheck={false}
            type="text"
            value={draft}
          />
        </form>
      ) : (
        <div
          aria-label="주소"
          className="folder-navigation__breadcrumb"
          onClick={(event) => {
            if (event.target === event.currentTarget) beginEditing();
          }}
          role="group"
        >
          {parts.leading.map((item, index) =>
            renderSegment(item, parts.hidden.length === 0 && index === parts.leading.length - 1),
          )}
          {parts.hidden.length > 0 ? (
            <span className="folder-navigation__segment">
              <Menu.Root>
                <Menu.Trigger
                  aria-label="생략된 상위 폴더"
                  className="folder-navigation__breadcrumb-button"
                >
                  <MoreHorizontal20Regular aria-hidden="true" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner align="start" sideOffset={4}>
                    <Menu.Popup aria-label="생략된 상위 폴더" className="folder-navigation__menu">
                      {parts.hidden.map((item) => (
                        <Menu.Item
                          className="folder-navigation__menu-item"
                          key={item.path}
                          onClick={() => navigate(item)}
                        >
                          {item.name}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
              <ChevronRight16Regular aria-hidden="true" />
            </span>
          ) : null}
          {parts.trailing.map((item) => renderSegment(item, true))}
        </div>
      )}
    </nav>
  );
};

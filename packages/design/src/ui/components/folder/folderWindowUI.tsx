import { Folder20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import {
  RouteInputUI,
  TagInputUI,
  WindowControlsUI,
  WindowFrameUI,
  WindowRouteBarUI,
  WindowTabUI,
  WindowTitleBarUI,
} from "../window";
import { FolderCategoryItemUI } from "./folderCategoryItemUI";
import { FolderFileCardUI } from "./folderFileCardUI";
import { FolderFileGridUI } from "./folderFileGridUI";
import { FolderSidebarFileItemUI } from "./folderSidebarFileItemUI";
import { FolderSidebarUI } from "./folderSidebarUI";
import type { FolderWindowUIProps } from "./folderUI.types";
import { FolderViewerUI } from "./folderViewerUI";

import "./folderUI.css";

/**
 * Folder chrome, route/tag fields, sidebar tree와 file grid를 하나의 production Component로 제공한다.
 *
 * presentation DTO와 callback만 받으며 Resource identity, routing, selection persistence는 소유하지 않는다.
 */
export const FolderWindowUI = ({
  cardSize = "medium",
  categories,
  className,
  controlsProps,
  files,
  icon = <Folder20Regular aria-hidden="true" />,
  onCategoryOpenChange,
  onCategorySelect,
  onFileOpen,
  onFileSelect,
  onSidebarFileSelect,
  routeBarProps,
  routeInputProps,
  sidebarLabel,
  tagInputProps,
  title,
  viewerLabel,
  ...props
}: FolderWindowUIProps) => (
  <WindowFrameUI
    {...props}
    className={clsx("wd-folder-window-ui", className)}
    routeBar={
      <WindowRouteBarUI
        {...routeBarProps}
        tagInput={tagInputProps ? <TagInputUI {...tagInputProps} /> : undefined}
      >
        <RouteInputUI {...routeInputProps} shape="rounded" />
      </WindowRouteBarUI>
    }
    titleBar={
      <WindowTitleBarUI controls={<WindowControlsUI {...controlsProps} />}>
        <WindowTabUI icon={icon} titleContent={title} />
      </WindowTitleBarUI>
    }
    variant="folder"
  >
    <FolderViewerUI
      aria-label={viewerLabel}
      sidebar={
        <FolderSidebarUI aria-label={sidebarLabel}>
          {categories.map((category) => (
            <FolderCategoryItemUI
              defaultOpen={category.defaultOpen}
              disabled={category.disabled}
              disclosureLabel={category.disclosureLabel}
              icon={category.icon}
              key={category.value}
              label={category.label}
              onOpenChange={(open) => onCategoryOpenChange?.({ open, value: category.value })}
              onSelect={() => onCategorySelect?.({ value: category.value })}
              open={category.open}
              selected={category.selected}
            >
              {category.files?.map((file) => (
                <FolderSidebarFileItemUI
                  buttonProps={{ disabled: file.disabled }}
                  icon={file.icon}
                  key={file.value}
                  onSelect={() =>
                    onSidebarFileSelect?.({ categoryValue: category.value, value: file.value })
                  }
                  selected={file.selected}
                  title={file.title}
                />
              ))}
            </FolderCategoryItemUI>
          ))}
        </FolderSidebarUI>
      }
      sidebarLabel={sidebarLabel}
    >
      <FolderFileGridUI aria-label={`${viewerLabel} 파일`} cardSize={cardSize}>
        {files.map((file) => (
          <FolderFileCardUI
            cover={file.cover}
            disabled={file.disabled}
            key={file.value}
            onClick={() => onFileSelect?.({ value: file.value })}
            onDoubleClick={() => onFileOpen?.({ value: file.value })}
            selected={file.selected}
            title={file.title}
          />
        ))}
      </FolderFileGridUI>
    </FolderViewerUI>
  </WindowFrameUI>
);

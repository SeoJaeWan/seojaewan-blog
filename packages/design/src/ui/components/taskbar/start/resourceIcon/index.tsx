/**
 * @file Start pinned와 모두 보기에서 공유하는 Resource icon 주입과 fallback을 제공한다.
 */
import type { ReactNode } from "react";

import {
  Document24Regular,
  Document32Regular,
  Link24Regular,
  Link32Regular,
} from "@fluentui/react-icons";

import type { ResourceRef } from "../../../../../headless/index.js";
import fileExplorerIconSrc from "../../../../assets/taskbar/applications/file-explorer.png";

/** Application이 공통 Resource identity를 실제 Start icon으로 바꾸는 표현 경계다. */
export type TaskbarStartResourceIconResolver = (resource: ResourceRef) => ReactNode | undefined;

type TaskbarStartResourceIconProps = Readonly<{
  /** pinned와 모두 보기 wrapper가 제공하는 실제 icon 크기다. */
  size: 24 | 32;
  /** 표시할 Folder, Content 또는 ExternalShortcut identity다. */
  resource: ResourceRef;
  /** Application이 Content browser와 ExternalShortcut brand icon을 제공하는 resolver다. */
  resolveIcon?: TaskbarStartResourceIconResolver;
}>;

/** resolver 결과가 없을 때 Resource kind별 안정적인 장식 icon을 반환한다. */
const defaultIcon = (resource: ResourceRef, size: 24 | 32): ReactNode => {
  if (resource.kind === "folder") {
    return <img alt="" aria-hidden="true" draggable={false} src={fileExplorerIconSrc} />;
  }
  if (resource.kind === "content") {
    return size === 24 ? (
      <Document24Regular aria-hidden="true" />
    ) : (
      <Document32Regular aria-hidden="true" />
    );
  }
  return size === 24 ? <Link24Regular aria-hidden="true" /> : <Link32Regular aria-hidden="true" />;
};

/** 같은 resolver 우선순위를 pinned와 모두 보기에 적용한다. */
export const TaskbarStartResourceIcon = ({
  resolveIcon,
  resource,
  size,
}: TaskbarStartResourceIconProps) => resolveIcon?.(resource) ?? defaultIcon(resource, size);

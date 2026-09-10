/**
 * @file Start pinned와 모두 보기에서 공유하는 Resource icon 표현을 제공한다.
 *
 * Resource별 browser·brand 선택은 Application resolver가 소유하며 이 Component는 주입 결과와
 * Resource kind별 fallback을 장식 icon으로 렌더링한다.
 */
import type { ReactNode } from "react";

import {
  Document24Regular,
  Document32Regular,
  Link24Regular,
  Link32Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ResourceRef } from "../../../../../headless/index.js";
import fileExplorerIconSrc from "../../../../assets/taskbar/applications/file-explorer.png";

import "./taskbarStartIcon.css";

/**
 * Application이 공통 Resource identity를 실제 Start icon으로 바꾸는 표현 경계다.
 */
export type TaskbarStartResourceIconResolver = (resource: ResourceRef) => ReactNode | undefined;

/**
 * Start 화면 위치에 맞는 icon slot 크기와 fallback glyph 크기를 선택한다.
 */
export type TaskbarStartIconVariant = "all" | "pinned";

/**
 * Start의 Resource icon 표현에 필요한 identity, resolver와 표시 variant다.
 */
export type TaskbarStartIconProps = Readonly<{
  /** 외부 배치가 icon slot에 추가할 class 이름이다. */
  className?: string;
  /** 표시할 Folder, Content 또는 ExternalShortcut identity다. */
  resource: ResourceRef;
  /** Application이 Content browser와 ExternalShortcut brand icon을 제공하는 resolver다. */
  resolveIcon?: TaskbarStartResourceIconResolver;
  /** pinned tile 또는 모두 보기 row에 맞는 icon 크기다. */
  variant: TaskbarStartIconVariant;
}>;

/**
 * resolver 결과가 없을 때 Resource kind와 표시 variant에 맞는 장식 glyph를 반환한다.
 */
const defaultIcon = (resource: ResourceRef, variant: TaskbarStartIconVariant): ReactNode => {
  if (resource.kind === "folder") {
    return <img alt="" aria-hidden="true" draggable={false} src={fileExplorerIconSrc} />;
  }
  if (resource.kind === "content") {
    return variant === "all" ? (
      <Document24Regular aria-hidden="true" />
    ) : (
      <Document32Regular aria-hidden="true" />
    );
  }
  return variant === "all" ? (
    <Link24Regular aria-hidden="true" />
  ) : (
    <Link32Regular aria-hidden="true" />
  );
};

/**
 * Application icon을 우선하고 누락 시 kind별 fallback을 같은 장식 wrapper에 렌더링한다.
 */
export const TaskbarStartIcon = ({
  className,
  resolveIcon,
  resource,
  variant,
}: TaskbarStartIconProps) => (
  <span
    aria-hidden="true"
    className={clsx("taskbar-start-icon", `taskbar-start-icon--${variant}`, className)}
  >
    {resolveIcon?.(resource) ?? defaultIcon(resource, variant)}
  </span>
);

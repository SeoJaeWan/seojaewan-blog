import { Dismiss16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { IconButtonUI } from "../../primitives";
import { ScaledPreviewUI } from "./scaledPreviewUI";
import type { TaskbarPreviewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * session title, select/close interaction과 실제 Window scaled content를 갖는 preview card다.
 */
export const TaskbarPreviewUI = ({
  "aria-label": ariaLabel,
  className,
  hidden,
  icon,
  motion = "full",
  onClose,
  onSelect,
  preview,
  state = "visible",
  title,
  ...props
}: TaskbarPreviewUIProps) => (
  <section
    {...props}
    aria-label={ariaLabel ?? title}
    className={clsx("wd-taskbar-preview-ui", className)}
    data-motion={motion}
    data-state={state}
    hidden={hidden || state === "hidden"}
  >
    <button
      aria-label={title}
      className="wd-taskbar-preview-ui__select"
      onClick={onSelect}
      type="button"
    />
    <header className="wd-taskbar-preview-ui__titlebar">
      <span aria-hidden="true" className="wd-taskbar-preview-ui__icon">
        {icon}
      </span>
      <span className="wd-taskbar-preview-ui__title">{title}</span>
      {onClose ? (
        <IconButtonUI
          className="wd-taskbar-preview-ui__close"
          icon={<Dismiss16Regular />}
          label={`${title} 닫기`}
          onClick={onClose}
          size="sm"
        />
      ) : null}
    </header>
    <div className="wd-taskbar-preview-ui__content">
      <ScaledPreviewUI>{preview}</ScaledPreviewUI>
    </div>
  </section>
);

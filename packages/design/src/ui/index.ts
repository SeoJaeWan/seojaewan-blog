/// <reference types="vite/client" />

import "./tokens/index.css";

export {
  createWindowPresentationBinding,
  WindowControls,
  type WindowControlsProps,
  WindowFrame,
  type WindowFrameBounds,
  type WindowFrameMode,
  type WindowFrameProps,
  type WindowFrameVariant,
  type WindowMoveStartHandler,
  type WindowPresentationBinding,
  type WindowPresentationConsumer,
  WindowResizeHandles,
  type WindowResizeHandlesProps,
  type WindowResizeStartHandler,
  WindowRoot,
  type WindowRootProps,
  WindowTitleBar,
  type WindowTitleBarProps,
} from "./components/common/window/index.js";
export {
  TaskbarApplicationButton,
  type TaskbarApplicationButtonProps,
} from "./components/taskbar/items/index.js";
export { TaskbarRoot, type TaskbarRootProps } from "./components/taskbar/root/index.js";
export { TaskbarSearch, type TaskbarSearchProps } from "./components/taskbar/search/index.js";
export {
  TaskbarStartButton,
  type TaskbarStartButtonProps,
} from "./components/taskbar/start/index.js";
export {
  TaskbarTimestamp,
  type TaskbarTimestampProps,
} from "./components/taskbar/timestamp/index.js";

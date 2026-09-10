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
  type WindowMotionDestination,
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
export {
  TaskbarSearch,
  TaskbarSearchPanel,
  type TaskbarSearchPanelProps,
  type TaskbarSearchProps,
} from "./components/taskbar/search/index.js";
export {
  type StartPinnedItemViewModel,
  TaskbarStart,
  TaskbarStartAll,
  type TaskbarStartAllProps,
  TaskbarStartButton,
  type TaskbarStartButtonProps,
  TaskbarStartPinned,
  type TaskbarStartPinnedProps,
  type TaskbarStartProps,
  type TaskbarStartSearchInputProps,
} from "./components/taskbar/start/index.js";
export {
  TaskbarTimestamp,
  type TaskbarTimestampProps,
} from "./components/taskbar/timestamp/index.js";

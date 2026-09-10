/**
 * @file Taskbar primary panel의 surface, Base UI widget과 제품 controller 연결을 공개한다.
 */
export {
  type TaskbarPanelConnection,
  type TaskbarPanelConnectionActions,
  type TaskbarPanelsConnection,
  type TaskbarPanelWidgetConnection,
  type TaskbarSearchResourceConnection,
  useTaskbarPanelsConnection,
} from "./connection/index.js";
export {
  TaskbarPanelSurface,
  type TaskbarPanelSurfaceProps,
  type TaskbarPanelSurfaceVariant,
} from "./surface/index.js";
export {
  type TaskbarPanelOpenChangeReason,
  TaskbarPanelWidget,
  type TaskbarPanelWidgetProps,
  type TaskbarPanelWidgetVariant,
} from "./widget/index.js";

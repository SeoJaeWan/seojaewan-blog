/**
 * @file Taskbar Root controller의 DOM-free model과 React 연결을 공개한다.
 *
 * 새로운 동작을 구현하지 않고 하위 요소의 public API만 조합한다.
 */
export { useTaskbarRootController } from "./controller/index.js";
export {
  selectTaskbarRootSnapshot,
  type TaskbarRootController,
  type TaskbarRootSnapshot,
  type TaskbarRootViewModel,
} from "./model/index.js";

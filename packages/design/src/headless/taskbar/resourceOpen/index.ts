/**
 * @file Taskbar Resource open의 DOM-free Operation과 Application adapter 계약을 공개한다.
 *
 * panel lifecycle 연결은 runtime consumer가 primary panel Action으로 명시한다.
 */
export {
  type ExternalShortcutNavigationPort,
  type ExternalShortcutNavigationResult,
  type ResourceOpenAction,
  ResourceOpenOperations,
  type ResourceOpenOperationsOptions,
  type ResourceOpenResult,
  type ResourceOpenWindowAction,
  type ResourceOpenWindowOperationPort,
} from "./operations/index.js";

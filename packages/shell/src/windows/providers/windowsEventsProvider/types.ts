import type {
  WindowDispatch,
  WindowEventListener,
  WindowEventName,
  WindowStateEventMap,
} from "../../types";

export type EmitWindowStateEvent = <Name extends keyof WindowStateEventMap>(
  eventName: Name,
  payload: WindowStateEventMap[Name],
) => void;

export type SubscribeWindowEvent = <Name extends WindowEventName>(
  eventName: Name,
  listener: WindowEventListener<Name>,
) => () => void;

export interface WindowsEventsContextValue {
  dispatch: WindowDispatch;
  emitStateEvent: EmitWindowStateEvent;
  subscribe: SubscribeWindowEvent;
}

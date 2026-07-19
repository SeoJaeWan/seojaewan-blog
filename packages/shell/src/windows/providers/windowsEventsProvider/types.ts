import type { WindowEventListener, WindowEventMap, WindowEventName } from "../../types";

export type DispatchWindowEvent = <Name extends WindowEventName>(
  eventName: Name,
  payload: WindowEventMap[Name],
) => void;

export type SubscribeWindowEvent = <Name extends WindowEventName>(
  eventName: Name,
  listener: WindowEventListener<Name>,
) => () => void;

export interface WindowsEventsContextValue {
  dispatch: DispatchWindowEvent;
  subscribe: SubscribeWindowEvent;
}

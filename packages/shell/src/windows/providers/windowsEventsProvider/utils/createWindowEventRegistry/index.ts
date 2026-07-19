import type { WindowEventListener, WindowEventMap, WindowEventName } from "../../../../types";

type StoredWindowEventListener = (...payload: never[]) => void;

export type WindowEventErrorReporter = (error: unknown) => void;

export interface WindowEventRegistry {
  emit: <Name extends WindowEventName>(eventName: Name, payload: WindowEventMap[Name]) => void;
  subscribe: <Name extends WindowEventName>(
    eventName: Name,
    listener: WindowEventListener<Name>,
  ) => () => void;
}

export interface CreateWindowEventRegistryOptions {
  reportError?: WindowEventErrorReporter;
}

interface GlobalWithReportError {
  reportError?: WindowEventErrorReporter;
}

const reportWindowEventError: WindowEventErrorReporter = (error) => {
  const globalReportError = (globalThis as GlobalWithReportError).reportError;

  if (globalReportError) {
    globalReportError(error);
    return;
  }

  console.error(error);
};

/** Window event별 listener를 보관하고 listener 오류를 다른 observer와 격리한다. */
export const createWindowEventRegistry = ({
  reportError = reportWindowEventError,
}: CreateWindowEventRegistryOptions = {}): WindowEventRegistry => {
  const listenersByEvent = new Map<WindowEventName, Set<StoredWindowEventListener>>();

  const subscribe: WindowEventRegistry["subscribe"] = (eventName, listener) => {
    const listeners = listenersByEvent.get(eventName) ?? new Set<StoredWindowEventListener>();
    const storedListener = listener as StoredWindowEventListener;

    listeners.add(storedListener);
    listenersByEvent.set(eventName, listeners);

    return () => {
      listeners.delete(storedListener);

      if (listeners.size === 0) {
        listenersByEvent.delete(eventName);
      }
    };
  };

  const emit: WindowEventRegistry["emit"] = (eventName, payload) => {
    const listeners = listenersByEvent.get(eventName);

    if (!listeners) {
      return;
    }

    for (const storedListener of [...listeners]) {
      try {
        const listener = storedListener as WindowEventListener<typeof eventName>;
        listener(payload);
      } catch (error) {
        reportError(error);
      }
    }
  };

  return { emit, subscribe };
};

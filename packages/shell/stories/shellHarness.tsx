import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import type { WindowItem } from "@window/ui";
import { TaskbarRoot } from "@window/ui";

import type { WindowEventName } from "../src";
import { TaskbarPanelHost, useWindowEvent, Windows } from "../src";

interface ShellEventEntry {
  id: number;
  name: WindowEventName;
  payload: unknown;
}

export interface ShellHarnessItemState {
  label: string;
  windowsItems: readonly WindowItem[];
}

export interface ShellHarnessProps {
  /** 이후 Start, Search, app list connector를 같은 host 아래에 추가하는 taskbar slot. */
  taskbarItems: ReactNode;
  /** Story에서 동적 item 갱신을 재현할 때 노출할 상태 전환 목록. */
  itemStates?: readonly ShellHarnessItemState[];
  /** Windows domain에 처음 전달할 전체 item. */
  windowsItems: readonly WindowItem[];
}

const omitEventIcon = (key: string, value: unknown): unknown =>
  key === "icon" ? undefined : value;

const serializeEventPayload = (payload: unknown) => JSON.stringify(payload, omitEventIcon);

const ShellEventProbe = () => {
  const [events, setEvents] = useState<readonly ShellEventEntry[]>([]);
  const appendEvent = useCallback((name: WindowEventName, payload: unknown) => {
    setEvents((current) => {
      const previousId = current.at(-1)?.id ?? 0;

      return [...current.slice(-7), { id: previousId + 1, name, payload }];
    });
  }, []);

  useWindowEvent("windowContextMenuRequested", (payload) =>
    appendEvent("windowContextMenuRequested", payload),
  );
  useWindowEvent("windowOpen", (payload) => appendEvent("windowOpen", payload));
  useWindowEvent("windowOpenLocation", (payload) => appendEvent("windowOpenLocation", payload));
  useWindowEvent("windowPinToStart", (payload) => appendEvent("windowPinToStart", payload));
  useWindowEvent("windowPinToTaskbar", (payload) => appendEvent("windowPinToTaskbar", payload));
  useWindowEvent("windowsItemsUpdated", (payload) => appendEvent("windowsItemsUpdated", payload));
  useWindowEvent("windowsPinsReordered", (payload) => appendEvent("windowsPinsReordered", payload));
  useWindowEvent("windowUnpinFromStart", (payload) => appendEvent("windowUnpinFromStart", payload));
  useWindowEvent("windowUnpinFromTaskbar", (payload) =>
    appendEvent("windowUnpinFromTaskbar", payload),
  );

  return (
    <aside aria-label="Shell event log" className="wb-shell-story__events">
      <header className="wb-shell-story__tool-header">
        <strong>Shell events</strong>
        <button onClick={() => setEvents([])} type="button">
          비우기
        </button>
      </header>
      <ol data-testid="shell-event-log">
        {events.length === 0 ? <li>아직 전달된 event가 없습니다.</li> : null}
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.name}</strong>
            <code>{serializeEventPayload(event.payload)}</code>
          </li>
        ))}
      </ol>
    </aside>
  );
};

export const ShellHarness = ({
  itemStates = [],
  taskbarItems,
  windowsItems: initialWindowsItems,
}: ShellHarnessProps) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const [windowsItems, setWindowsItems] = useState<readonly WindowItem[]>(initialWindowsItems);

  return (
    <div ref={setPortalContainer} className="wb-shell-story" data-testid="shell-story-surface">
      {portalContainer ? (
        <Windows windowsItems={windowsItems}>
          <ShellEventProbe />
          {itemStates.length >= 1 ? (
            <aside
              aria-label="Shell fixture controls"
              className="wb-shell-story__fixtures"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <header className="wb-shell-story__tool-header">
                <strong>Fixture state</strong>
              </header>
              <div className="wb-shell-story__fixture-actions">
                <button onClick={() => setWindowsItems(initialWindowsItems)} type="button">
                  초기 항목
                </button>
                {itemStates.map((itemState) => (
                  <button
                    key={itemState.label}
                    onClick={() => setWindowsItems(itemState.windowsItems)}
                    type="button"
                  >
                    {itemState.label}
                  </button>
                ))}
              </div>
            </aside>
          ) : null}
          <TaskbarPanelHost portalContainer={portalContainer}>
            <TaskbarRoot>{taskbarItems}</TaskbarRoot>
          </TaskbarPanelHost>
        </Windows>
      ) : null}
    </div>
  );
};

import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import type { WindowItem } from "@window/ui";
import { TaskbarRootUI } from "@window/ui";

import type { WindowEventName } from "../src";
import { TaskbarPanel, useWindowEvent, Windows } from "../src";
import type { ShellStorageSeed } from "./shellFixtures";
import { resetShellStoryStorage, seedShellStoryStorage } from "./shellFixtures";

interface ShellEventEntry {
  id: number;
  name: WindowEventName;
  payload: unknown;
}

export interface ShellHarnessItemState {
  label: string;
  windowsItems: readonly WindowItem[];
}

export interface ShellHarnessStatePreset extends ShellHarnessItemState {
  storageSeed?: ShellStorageSeed;
}

export interface ShellHarnessProps {
  /** 이후 Start, Search, app list connector를 같은 host 아래에 추가하는 taskbar slot. */
  taskbarItems: ReactNode;
  /** Story에서 동적 item 갱신을 재현할 때 노출할 상태 전환 목록. */
  itemStates?: readonly ShellHarnessItemState[];
  /** storage와 item을 함께 초기화하고 Provider를 다시 조립할 상태 목록. */
  statePresets?: readonly ShellHarnessStatePreset[];
  /** Story 초기화와 수동 복원에 사용할 surface별 localStorage 값. */
  storageSeed?: ShellStorageSeed;
  /** Windows domain에 처음 전달할 전체 item. */
  windowsItems: readonly WindowItem[];
}

const omitEventIcon = (key: string, value: unknown): unknown =>
  key === "icon" ? undefined : value;

const serializeEventPayload = (payload: unknown) => JSON.stringify(payload, omitEventIcon);

interface ShellEventProbeProps {
  onResetStory: () => void;
}

const ShellEventProbe = ({ onResetStory }: ShellEventProbeProps) => {
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
    <aside
      aria-label="발생 이벤트"
      className="wb-shell-story__events"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="wb-shell-story__tool-header">
        <strong>발생 이벤트</strong>
        <div className="wb-shell-story__tool-actions">
          <button onClick={onResetStory} type="button">
            전체 초기화
          </button>
          <button onClick={() => setEvents([])} type="button">
            비우기
          </button>
        </div>
      </header>
      <ol data-testid="shell-event-log">
        {events.length === 0 ? <li>아직 발생한 event가 없습니다.</li> : null}
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
  statePresets = [],
  storageSeed = {},
  taskbarItems,
  windowsItems: initialWindowsItems,
}: ShellHarnessProps) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const [storyVersion, setStoryVersion] = useState(0);
  const [activeStatePreset, setActiveStatePreset] = useState<string | null>(
    statePresets.at(0)?.label ?? null,
  );
  const [windowsItems, setWindowsItems] = useState<readonly WindowItem[]>(initialWindowsItems);
  const resetStory = useCallback(() => {
    resetShellStoryStorage();
    seedShellStoryStorage(storageSeed);
    setActiveStatePreset(statePresets.at(0)?.label ?? null);
    setWindowsItems(initialWindowsItems);
    setStoryVersion((current) => current + 1);
  }, [initialWindowsItems, statePresets, storageSeed]);
  const applyStatePreset = useCallback((statePreset: ShellHarnessStatePreset) => {
    resetShellStoryStorage();
    seedShellStoryStorage(statePreset.storageSeed ?? {});
    setActiveStatePreset(statePreset.label);
    setWindowsItems(statePreset.windowsItems);
    setStoryVersion((current) => current + 1);
  }, []);

  return (
    <div ref={setPortalContainer} className="wb-shell-story" data-testid="shell-story-surface">
      {portalContainer ? (
        <Windows key={storyVersion} windowsItems={windowsItems}>
          <ShellEventProbe onResetStory={resetStory} />
          {statePresets.length >= 1 || itemStates.length >= 1 ? (
            <aside
              aria-label="동작 상태"
              className="wb-shell-story__fixtures"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <header className="wb-shell-story__tool-header">
                <strong>동작 상태</strong>
              </header>
              {statePresets.length >= 1 ? (
                <section className="wb-shell-story__fixture-group">
                  <strong>초기 상태 프리셋</strong>
                  <div className="wb-shell-story__fixture-actions">
                    {statePresets.map((statePreset) => (
                      <button
                        key={statePreset.label}
                        aria-pressed={activeStatePreset === statePreset.label}
                        onClick={() => applyStatePreset(statePreset)}
                        type="button"
                      >
                        {statePreset.label}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {itemStates.length >= 1 ? (
                <section className="wb-shell-story__fixture-group">
                  <strong>현재 항목 변경</strong>
                  <div className="wb-shell-story__fixture-actions">
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
                </section>
              ) : null}
            </aside>
          ) : null}
          <TaskbarPanel portalContainer={portalContainer}>
            <TaskbarRootUI>{taskbarItems}</TaskbarRootUI>
          </TaskbarPanel>
        </Windows>
      ) : null}
    </div>
  );
};

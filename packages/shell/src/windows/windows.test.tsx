import { createElement } from "react";

import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Windows } from "./index";
import { useWindowEvent } from "./providers/windowsEventsProvider";
import { useWindowsPins } from "./providers/windowsPinsProvider";
import type { WindowPinEvent } from "./types";

const INITIAL_ITEMS = [{ id: "calculator", title: "계산기" }] satisfies readonly WindowItem[];

interface PinUpdateProbeProps {
  onEvent: (payload: WindowPinEvent) => void;
}

const PinUpdateProbe = ({ onEvent }: PinUpdateProbeProps) => {
  const pins = useWindowsPins();

  useWindowEvent("windowPinToStart", (payload) => {
    onEvent(payload);
  });

  return createElement(
    "div",
    null,
    createElement("output", { "data-testid": "windows-pins" }, JSON.stringify(pins.pinnedIds)),
    createElement(
      "button",
      {
        onClick: () => pins.pin("calculator"),
        type: "button",
      },
      "pin",
    ),
  );
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Windows", () => {
  it("item을 pin하면 완료 event를 전달하고 다음 화면에 변경된 pin 목록을 제공한다", async () => {
    const onEvent = vi.fn<(payload: WindowPinEvent) => void>();

    render(
      createElement(Windows, {
        children: createElement(PinUpdateProbe, { onEvent }),
        windowsItems: INITIAL_ITEMS,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "pin" }));

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({
      itemId: "calculator",
      pinnedIds: ["calculator"],
      previousPinnedIds: [],
    });
    await waitFor(() =>
      expect(screen.getByTestId("windows-pins").textContent).toBe(JSON.stringify(["calculator"])),
    );
  });
});

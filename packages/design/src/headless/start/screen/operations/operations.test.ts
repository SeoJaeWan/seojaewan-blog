/** @file Start screen Action routing과 transient-only reset을 검증한다. */
import { describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../../resources/index.js";
import type { StartSnapshot } from "../../model/index.js";
import { StartScreenOperations } from "./index.js";

describe("StartScreenOperations", () => {
  it("view와 index Action의 changed와 no-op 결과를 immutable하게 반환한다", () => {
    const operations = new StartScreenOperations();
    const listener = vi.fn();
    operations.subscribe(listener);

    const view = operations.execute({ type: "set-view", view: "all" });
    const index = operations.execute({ type: "set-index-open", open: true });
    const noOp = operations.execute({ type: "set-index-open", open: true });

    expect(view).toMatchObject({ status: "changed", snapshot: { view: "all" } });
    expect(index).toMatchObject({ status: "changed", snapshot: { indexOpen: true } });
    expect(noOp).toMatchObject({ status: "no-op", snapshot: index.snapshot });
    expect(noOp.snapshot).toBe(index.snapshot);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.action)).toBe(true);
  });

  it.each(["close-complete", "mobile"] as const)(
    "%s reset Action은 screen state만 초기화하고 stored Start Pin identity와 순서를 보존한다",
    (reason) => {
      const first = createResourceRef("content", "30000000-0000-4000-8000-000000000001");
      const second = createResourceRef("external-shortcut", "30000000-0000-4000-8000-000000000002");
      const storedPins: StartSnapshot = Object.freeze({
        pinnedItems: Object.freeze([
          Object.freeze({ resource: first }),
          Object.freeze({ resource: second }),
        ]),
      });
      const operations = new StartScreenOperations();
      operations.execute({ type: "set-view", view: "all" });
      operations.execute({ type: "set-index-open", open: true });

      const result = operations.execute({ type: "reset", reason });

      expect(result).toEqual({
        status: "changed",
        action: { type: "reset", reason },
        snapshot: { view: "pinned", indexOpen: false },
        change: { kind: "reset" },
      });
      expect(storedPins.pinnedItems.map(({ resource }) => resource)).toEqual([first, second]);
    },
  );
});

/** @file Start screen atomic command의 changed, no-op과 reset 계약을 검증한다. */
import { describe, expect, it } from "vitest";

import type { StartScreenSnapshot } from "../model/index.js";
import { resetStartScreen, setStartScreenIndexOpen, setStartScreenView } from "./index.js";

/** 명령 전제를 명시하는 immutable Start screen snapshot을 만든다. */
const snapshot = (view: StartScreenSnapshot["view"], indexOpen: boolean): StartScreenSnapshot =>
  Object.freeze({ view, indexOpen });

describe("Start screen commands", () => {
  it("view 변경은 새 immutable snapshot을 만들고 동일 view는 identity-preserving no-op이다", () => {
    const current = snapshot("pinned", false);
    const changed = setStartScreenView(current, "all");

    expect(changed).toEqual({
      status: "changed",
      snapshot: { view: "all", indexOpen: false },
      change: { kind: "view-changed", view: "all" },
    });
    expect(Object.isFrozen(changed)).toBe(true);
    expect(Object.isFrozen(changed.snapshot)).toBe(true);
    expect(Object.isFrozen(changed.change)).toBe(true);
    expect(current).toEqual({ view: "pinned", indexOpen: false });

    const noOp = setStartScreenView(changed.snapshot, "all");
    expect(noOp).toEqual({ status: "no-op", snapshot: changed.snapshot, change: null });
    expect(noOp.snapshot).toBe(changed.snapshot);
    expect(Object.isFrozen(noOp)).toBe(true);
  });

  it("index는 all view에서만 열리고 pinned 전환이 열린 index를 함께 닫는다", () => {
    const pinned = snapshot("pinned", false);
    expect(setStartScreenIndexOpen(pinned, true).snapshot).toBe(pinned);

    const all = snapshot("all", false);
    const opened = setStartScreenIndexOpen(all, true);
    expect(opened).toEqual({
      status: "changed",
      snapshot: { view: "all", indexOpen: true },
      change: { kind: "index-changed", open: true },
    });
    expect(setStartScreenIndexOpen(opened.snapshot, true).snapshot).toBe(opened.snapshot);
    expect(setStartScreenView(opened.snapshot, "pinned")).toEqual({
      status: "changed",
      snapshot: { view: "pinned", indexOpen: false },
      change: { kind: "view-changed", view: "pinned" },
    });
  });

  it("reset은 transient state만 초기화하고 이미 초기 상태이면 no-op이다", () => {
    const current = snapshot("all", true);
    const result = resetStartScreen(current);

    expect(result).toEqual({
      status: "changed",
      snapshot: { view: "pinned", indexOpen: false },
      change: { kind: "reset" },
    });
    expect(current).toEqual({ view: "all", indexOpen: true });

    const noOp = resetStartScreen(result.snapshot);
    expect(noOp.snapshot).toBe(result.snapshot);
    expect(noOp.status).toBe("no-op");
  });
});

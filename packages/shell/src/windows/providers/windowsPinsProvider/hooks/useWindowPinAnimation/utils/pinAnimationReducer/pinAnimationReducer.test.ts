import { describe, expect, it } from "vitest";

import type { WindowsPinsMutation } from "../../../../types";
import { createPinAnimationState, pinAnimationReducer } from ".";

type MutationWithoutRevision<T> = T extends unknown ? Omit<T, "revision"> : never;

const createMutation = (
  mutation: MutationWithoutRevision<WindowsPinsMutation>,
  revision = 1,
): WindowsPinsMutation => ({ ...mutation, revision });

describe("pinAnimationReducer", () => {
  it("초기 canonical 목록을 animation 없이 visual 목록으로 사용한다", () => {
    const state = createPinAnimationState(["calculator"], 3);

    expect(state).toEqual({
      activeStep: null,
      handledMutationRevision: 3,
      pendingSteps: [],
      renderedPinnedIds: ["calculator"],
      targetPinnedIds: ["calculator"],
    });
  });

  it("pin 변경은 canonical 목록에서 새 item의 in animation을 시작한다", () => {
    const state = pinAnimationReducer(createPinAnimationState(["calculator"]), {
      mutation: createMutation({
        itemId: "terminal",
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
        type: "pin",
      }),
      pinnedIds: ["calculator", "terminal"],
      type: "sync",
    });

    expect(state.activeStep).toEqual({
      itemId: "terminal",
      phase: "in",
      renderedPinnedIds: ["calculator", "terminal"],
    });
    expect(state.renderedPinnedIds).toEqual(["calculator", "terminal"]);
  });

  it("unpin 변경은 이전 visual 목록에서 item을 out한 뒤 제거한다", () => {
    const exitingState = pinAnimationReducer(createPinAnimationState(["calculator", "terminal"]), {
      mutation: createMutation({
        itemId: "calculator",
        pinnedIds: ["terminal"],
        previousPinnedIds: ["calculator", "terminal"],
        type: "unpin",
      }),
      pinnedIds: ["terminal"],
      type: "sync",
    });

    expect(exitingState.activeStep).toEqual({
      itemId: "calculator",
      phase: "out",
      renderedPinnedIds: ["calculator", "terminal"],
    });
    expect(exitingState.renderedPinnedIds).toEqual(["calculator", "terminal"]);

    const completedState = pinAnimationReducer(exitingState, {
      itemId: "calculator",
      phase: "out",
      type: "complete",
    });

    expect(completedState.activeStep).toBeNull();
    expect(completedState.renderedPinnedIds).toEqual(["terminal"]);
  });

  it("여러 stale item은 이전 visual 순서대로 하나씩 out한다", () => {
    const firstExit = pinAnimationReducer(
      createPinAnimationState(["calculator", "terminal", "notes"]),
      { mutation: null, pinnedIds: ["calculator"], type: "sync" },
    );

    expect(firstExit.activeStep?.itemId).toBe("terminal");
    expect(firstExit.renderedPinnedIds).toEqual(["calculator", "terminal", "notes"]);

    const secondExit = pinAnimationReducer(firstExit, {
      itemId: "terminal",
      phase: "out",
      type: "complete",
    });

    expect(secondExit.activeStep).toEqual({
      itemId: "notes",
      phase: "out",
      renderedPinnedIds: ["calculator", "notes"],
    });

    const completedState = pinAnimationReducer(secondExit, {
      itemId: "notes",
      phase: "out",
      type: "complete",
    });

    expect(completedState.activeStep).toBeNull();
    expect(completedState.renderedPinnedIds).toEqual(["calculator"]);
  });

  it("reorder 변경은 이전 순서에서 moved item을 out하고 canonical 순서에서 in한다", () => {
    const reorderedIds = ["terminal", "calculator"];
    const exitingState = pinAnimationReducer(createPinAnimationState(["calculator", "terminal"]), {
      mutation: createMutation({
        fromIndex: 1,
        itemId: "terminal",
        pinnedIds: reorderedIds,
        previousPinnedIds: ["calculator", "terminal"],
        toIndex: 0,
        type: "reorder",
      }),
      pinnedIds: reorderedIds,
      type: "sync",
    });

    expect(exitingState.activeStep).toEqual({
      itemId: "terminal",
      phase: "out",
      renderedPinnedIds: ["calculator", "terminal"],
    });
    expect(exitingState.targetPinnedIds).toEqual(reorderedIds);

    const enteringState = pinAnimationReducer(exitingState, {
      itemId: "terminal",
      phase: "out",
      type: "complete",
    });

    expect(enteringState.activeStep).toEqual({
      itemId: "terminal",
      phase: "in",
      renderedPinnedIds: reorderedIds,
    });
    expect(enteringState.renderedPinnedIds).toEqual(reorderedIds);

    const completedState = pinAnimationReducer(enteringState, {
      itemId: "terminal",
      phase: "in",
      type: "complete",
    });

    expect(completedState.activeStep).toBeNull();
    expect(completedState.renderedPinnedIds).toEqual(reorderedIds);
  });

  it("mutation 없는 storage 복원은 animation 없이 canonical 목록에 동기화한다", () => {
    const state = pinAnimationReducer(createPinAnimationState([]), {
      mutation: null,
      pinnedIds: ["calculator"],
      type: "sync",
    });

    expect(state.activeStep).toBeNull();
    expect(state.renderedPinnedIds).toEqual(["calculator"]);
  });

  it("animation 중 새 canonical 변경이 오면 기존 단계를 취소하고 latest 변경을 따른다", () => {
    const reorderState = pinAnimationReducer(createPinAnimationState(["calculator", "terminal"]), {
      mutation: createMutation({
        fromIndex: 1,
        itemId: "terminal",
        pinnedIds: ["terminal", "calculator"],
        previousPinnedIds: ["calculator", "terminal"],
        toIndex: 0,
        type: "reorder",
      }),
      pinnedIds: ["terminal", "calculator"],
      type: "sync",
    });

    const latestState = pinAnimationReducer(reorderState, {
      mutation: createMutation(
        {
          itemId: "calculator",
          pinnedIds: ["terminal"],
          previousPinnedIds: ["terminal", "calculator"],
          type: "unpin",
        },
        2,
      ),
      pinnedIds: ["terminal"],
      type: "sync",
    });

    expect(latestState.activeStep).toEqual({
      itemId: "calculator",
      phase: "out",
      renderedPinnedIds: ["calculator", "terminal"],
    });
    expect(latestState.targetPinnedIds).toEqual(["terminal"]);
    expect(latestState.handledMutationRevision).toBe(2);
  });

  it("현재 단계와 다른 item·phase의 완료 신호는 무시한다", () => {
    const state = pinAnimationReducer(createPinAnimationState(["calculator"]), {
      mutation: createMutation({
        itemId: "terminal",
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
        type: "pin",
      }),
      pinnedIds: ["calculator", "terminal"],
      type: "sync",
    });

    expect(
      pinAnimationReducer(state, { itemId: "calculator", phase: "in", type: "complete" }),
    ).toBe(state);
    expect(pinAnimationReducer(state, { itemId: "terminal", phase: "out", type: "complete" })).toBe(
      state,
    );
  });
});

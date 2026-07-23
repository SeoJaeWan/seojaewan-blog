import { describe, expect, it } from "vitest";

import type { WindowsPinsMutation } from "../../../../types";
import { createPinAnimationState, pinAnimationReducer } from ".";

type MutationWithoutRevision<T> = T extends unknown ? Omit<T, "revision"> : never;

const createMutation = (
  mutation: MutationWithoutRevision<WindowsPinsMutation>,
  revision = 1,
): WindowsPinsMutation => ({ ...mutation, revision });

describe("pinAnimationReducer", () => {
  describe("초기 표시", () => {
    it("처음 받은 pin 목록을 animation 없이 화면에 표시한다", () => {
      const state = createPinAnimationState(["calculator"], 3);

      expect(state).toEqual({
        activeStep: null,
        handledMutationRevision: 3,
        pendingSteps: [],
        renderedPinnedIds: ["calculator"],
        targetPinnedIds: ["calculator"],
      });
    });
  });

  describe("item 추가", () => {
    it("item이 pin 목록에 추가되면 최종 위치에서 들어오는 animation을 시작한다", () => {
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
  });

  describe("item 제거", () => {
    it("item이 pin 목록에서 제거되면 이전 화면에 남겨 두고 나가는 animation 뒤 제거한다", () => {
      const exitingState = pinAnimationReducer(
        createPinAnimationState(["calculator", "terminal"]),
        {
          mutation: createMutation({
            itemId: "calculator",
            pinnedIds: ["terminal"],
            previousPinnedIds: ["calculator", "terminal"],
            type: "unpin",
          }),
          pinnedIds: ["terminal"],
          type: "sync",
        },
      );

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

    it("여러 item이 한 번에 사라지면 이전 화면에 표시된 순서대로 하나씩 내보낸다", () => {
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
  });

  describe("pin 순서 변경", () => {
    it("pin 순서가 바뀌면 이동한 item을 이전 위치에서 내보내고 새 위치에서 다시 들어오게 한다", () => {
      const reorderedIds = ["terminal", "calculator"];
      const exitingState = pinAnimationReducer(
        createPinAnimationState(["calculator", "terminal"]),
        {
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
        },
      );

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
  });

  describe("목록 동기화", () => {
    it("localStorage에서 복원된 pin 목록은 animation 없이 바로 화면에 표시한다", () => {
      const state = pinAnimationReducer(createPinAnimationState([]), {
        mutation: null,
        pinnedIds: ["calculator"],
        type: "sync",
      });

      expect(state.activeStep).toBeNull();
      expect(state.renderedPinnedIds).toEqual(["calculator"]);
    });

    it("이미 처리한 같은 변경이 다시 전달돼도 진행 중인 animation을 다시 시작하지 않는다", () => {
      const mutation = createMutation({
        itemId: "terminal",
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
        type: "pin",
      });
      const action = {
        mutation,
        pinnedIds: ["calculator", "terminal"],
        type: "sync" as const,
      };
      const state = pinAnimationReducer(createPinAnimationState(["calculator"]), action);

      expect(pinAnimationReducer(state, action)).toBe(state);
    });

    it("이전에 처리한 변경 내용이 남아 있어도 새로 사라진 item은 정상적으로 내보낸다", () => {
      const state = pinAnimationReducer(createPinAnimationState(["calculator", "terminal"], 1), {
        mutation: createMutation({
          itemId: "terminal",
          pinnedIds: ["calculator", "terminal"],
          previousPinnedIds: ["calculator"],
          type: "pin",
        }),
        pinnedIds: ["calculator"],
        type: "sync",
      });

      expect(state.activeStep).toEqual({
        itemId: "terminal",
        phase: "out",
        renderedPinnedIds: ["calculator", "terminal"],
      });
      expect(state.targetPinnedIds).toEqual(["calculator"]);
    });
  });

  describe("겹친 변경 처리", () => {
    it("animation 중 pin 목록이 다시 바뀌면 기존 animation을 취소하고 가장 최근 목록을 따른다", () => {
      const reorderState = pinAnimationReducer(
        createPinAnimationState(["calculator", "terminal"]),
        {
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
        },
      );

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

    it("여러 변경이 겹쳐 안전한 animation을 만들 수 없으면 가장 최근 pin 목록을 바로 표시한다", () => {
      const state = pinAnimationReducer(createPinAnimationState(["calculator", "terminal"]), {
        mutation: null,
        pinnedIds: ["notes", "calculator"],
        type: "sync",
      });

      expect(state.activeStep).toBeNull();
      expect(state.pendingSteps).toEqual([]);
      expect(state.renderedPinnedIds).toEqual(["notes", "calculator"]);
      expect(state.targetPinnedIds).toEqual(["notes", "calculator"]);
    });
  });

  describe("animation 완료", () => {
    it("현재 animation 대상이나 단계와 맞지 않는 완료 신호는 무시한다", () => {
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
      expect(
        pinAnimationReducer(state, { itemId: "terminal", phase: "out", type: "complete" }),
      ).toBe(state);
    });
  });
});

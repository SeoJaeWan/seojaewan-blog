import type { WindowsPinsMutation } from "../../../../types";

export interface PinAnimationStep {
  itemId: string;
  phase: "in" | "out";
  renderedPinnedIds: readonly string[];
}

export interface PinAnimationState {
  activeStep: PinAnimationStep | null;
  handledMutationRevision: number;
  pendingSteps: readonly PinAnimationStep[];
  renderedPinnedIds: readonly string[];
  targetPinnedIds: readonly string[];
}

export type PinAnimationAction =
  | { itemId: string; phase: "in" | "out"; type: "complete" }
  | {
      mutation: WindowsPinsMutation | null;
      pinnedIds: readonly string[];
      type: "sync";
    };

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const isOrderedSubset = (subset: readonly string[], source: readonly string[]) => {
  let sourceIndex = 0;

  for (const itemId of subset) {
    while (sourceIndex < source.length && source[sourceIndex] !== itemId) {
      sourceIndex += 1;
    }

    if (sourceIndex === source.length) {
      return false;
    }

    sourceIndex += 1;
  }

  return true;
};

const createRemovalSteps = (
  renderedPinnedIds: readonly string[],
  pinnedIds: readonly string[],
): PinAnimationStep[] | null => {
  const pinnedIdSet = new Set(pinnedIds);

  if (!isOrderedSubset(pinnedIds, renderedPinnedIds)) {
    return null;
  }

  const steps: PinAnimationStep[] = [];
  let nextRenderedPinnedIds = [...renderedPinnedIds];

  for (const itemId of renderedPinnedIds) {
    if (pinnedIdSet.has(itemId)) {
      continue;
    }

    steps.push({ itemId, phase: "out", renderedPinnedIds: nextRenderedPinnedIds });
    nextRenderedPinnedIds = nextRenderedPinnedIds.filter((pinnedId) => pinnedId !== itemId);
  }

  return steps;
};

const moveItem = (pinnedIds: readonly string[], itemId: string, toIndex: number) => {
  const fromIndex = pinnedIds.indexOf(itemId);

  if (fromIndex === -1 || toIndex < 0 || toIndex >= pinnedIds.length) {
    return null;
  }

  const nextPinnedIds = [...pinnedIds];
  nextPinnedIds.splice(fromIndex, 1);
  nextPinnedIds.splice(toIndex, 0, itemId);
  return nextPinnedIds;
};

const createMutationSteps = (
  renderedPinnedIds: readonly string[],
  pinnedIds: readonly string[],
  mutation: WindowsPinsMutation,
): PinAnimationStep[] | null => {
  if (
    !arePinnedIdsEqual(renderedPinnedIds, mutation.previousPinnedIds) ||
    !arePinnedIdsEqual(pinnedIds, mutation.pinnedIds)
  ) {
    return null;
  }

  if (mutation.type === "pin") {
    return renderedPinnedIds.includes(mutation.itemId) || !pinnedIds.includes(mutation.itemId)
      ? null
      : [{ itemId: mutation.itemId, phase: "in", renderedPinnedIds: pinnedIds }];
  }

  if (mutation.type === "unpin") {
    return createRemovalSteps(renderedPinnedIds, pinnedIds);
  }

  const reorderedPinnedIds = moveItem(renderedPinnedIds, mutation.itemId, mutation.toIndex);

  return reorderedPinnedIds !== null && arePinnedIdsEqual(reorderedPinnedIds, pinnedIds)
    ? [
        { itemId: mutation.itemId, phase: "out", renderedPinnedIds },
        { itemId: mutation.itemId, phase: "in", renderedPinnedIds: pinnedIds },
      ]
    : null;
};

export const createPinAnimationState = (
  pinnedIds: readonly string[],
  mutationRevision = 0,
): PinAnimationState => ({
  activeStep: null,
  handledMutationRevision: mutationRevision,
  pendingSteps: [],
  renderedPinnedIds: pinnedIds,
  targetPinnedIds: pinnedIds,
});

const startSteps = (
  steps: readonly PinAnimationStep[],
  pinnedIds: readonly string[],
  handledMutationRevision: number,
): PinAnimationState => {
  const [activeStep, ...pendingSteps] = steps;

  if (activeStep === undefined) {
    return {
      activeStep: null,
      handledMutationRevision,
      pendingSteps: [],
      renderedPinnedIds: pinnedIds,
      targetPinnedIds: pinnedIds,
    };
  }

  return {
    activeStep,
    handledMutationRevision,
    pendingSteps,
    renderedPinnedIds: activeStep.renderedPinnedIds,
    targetPinnedIds: pinnedIds,
  };
};

export const pinAnimationReducer = (
  state: PinAnimationState,
  action: PinAnimationAction,
): PinAnimationState => {
  if (action.type === "complete") {
    if (state.activeStep?.itemId !== action.itemId || state.activeStep.phase !== action.phase) {
      return state;
    }

    return startSteps(state.pendingSteps, state.targetPinnedIds, state.handledMutationRevision);
  }

  const mutationRevision = action.mutation?.revision ?? state.handledMutationRevision;

  if (
    arePinnedIdsEqual(state.targetPinnedIds, action.pinnedIds) &&
    mutationRevision <= state.handledMutationRevision
  ) {
    return state;
  }

  const mutationSteps =
    action.mutation !== null && action.mutation.revision > state.handledMutationRevision
      ? createMutationSteps(state.renderedPinnedIds, action.pinnedIds, action.mutation)
      : null;
  const removalSteps =
    mutationSteps ?? createRemovalSteps(state.renderedPinnedIds, action.pinnedIds);

  return startSteps(
    removalSteps ?? [],
    action.pinnedIds,
    Math.max(state.handledMutationRevision, mutationRevision),
  );
};

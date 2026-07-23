export interface UseWindowsPins {
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  /** Windows pin 순서를 즉시 변경한다. visual animation은 이 canonical 변경을 구독한다. */
  reorder: (itemId: string, toIndex: number) => void;
  unpin: (itemId: string) => void;
}

interface WindowsPinsMutationBase {
  itemId: string;
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
  revision: number;
}

export type WindowsPinsMutation =
  | (WindowsPinsMutationBase & { type: "pin" })
  | (WindowsPinsMutationBase & {
      fromIndex: number;
      toIndex: number;
      type: "reorder";
    })
  | (WindowsPinsMutationBase & { type: "unpin" });

/** Provider 내부 animation projection에만 mutation snapshot을 추가로 제공한다. */
export interface WindowsPinsContextValue extends UseWindowsPins {
  mutation: WindowsPinsMutation | null;
}

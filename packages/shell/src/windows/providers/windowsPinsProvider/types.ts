export interface UseWindowsPins {
  /** Animation 완료 뒤 Windows panel의 실제 순서를 반영한다. */
  applyReorder: (itemId: string, toIndex: number) => void;
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  unpin: (itemId: string) => void;
}

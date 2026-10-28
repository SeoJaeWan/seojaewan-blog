import { create } from 'zustand';

import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';

/** 잘라내기 저장소. 잘라낸 항목과 바꾸는 동작이다 */
type ItemClipboardStore = {
  /** 잘라낸 항목 id. 비어 있으면 붙여넣을 것이 없다 */
  cutIds: readonly string[];
  /** 항목들을 잘라낸다. 앞서 잘라낸 항목은 잊는다 */
  cut: (ids: readonly string[]) => void;
  /** 잘라낸 항목을 잊는다(붙여넣은 뒤, 다시 시작) */
  clear: () => void;
};

/**
 * 잘라내기(Ctrl + X, 메뉴의 잘라내기) 상태를 담는 저장소. 바탕화면과 모든 탐색기 창이 함께 써서,
 * 어디서 잘라내도 다른 곳에서 붙여넣을 수 있게 창 밖(shared)에 둔다. 복사는 없고 옮기기만 한다.
 * 브라우저에 저장하지 않고, 다시 시작하면 비운다.
 * @codocs [[작업 공간:배치]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:구성]]
 */
export const useItemClipboardStore = create<ItemClipboardStore>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @returns 처음 상태와 조작
   */
  (set) => ({
    cutIds: [],
    cut: (ids) => {
      set({ cutIds: [...ids] });
    },
    clear: () => {
      set({ cutIds: [] });
    },
  }),
);

registerStoreReset(() => {
  useItemClipboardStore.getState().clear();
});

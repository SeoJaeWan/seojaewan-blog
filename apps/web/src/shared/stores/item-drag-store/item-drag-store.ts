import { create } from 'zustand';

/** 항목 끌기 저장소. 끄는 동안 포인터 아래의 놓을 곳이다 */
type ItemDragStore = {
  /** 포인터 아래의 놓을 곳 id(폴더 id, 휴지통 id, 바탕화면은 `desktop`). 끌지 않거나 놓을 곳이 아니면 null */
  targetId: string | null;
  /** 놓을 곳을 바꾼다 */
  setTargetId: (targetId: string | null) => void;
};

/**
 * 항목을 끄는 동안 포인터 아래의 놓을 곳을 담는 저장소. 끄는 쪽(바탕화면, 어느 탐색기 창)과 상관없이 놓을 곳을 그린 쪽이
 * 그 폴더 아이콘·항목·탐색 창 칸을 강조할 수 있게 창 밖에 둔다. 브라우저에 저장하지 않는다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @codocs [[파일 탐색기:조작]]
 */
export const useItemDragStore = create<ItemDragStore>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @returns 처음 상태와 조작
   */
  (set) => ({
    targetId: null,
    setTargetId: (targetId) => {
      set({ targetId });
    },
  }),
);

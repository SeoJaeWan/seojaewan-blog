import { create } from 'zustand';

/**
 * 탐색 창 즐겨찾기 항목 사이(놓을 자리)를 끄는 중인 상태
 * - areaId: 즐겨찾기를 그린 영역(탐색기 창 id). 그 창만 놓을 자리의 가로선을 그린다
 * - slot: 보이는 즐겨찾기에서 놓을 자리(그 차례의 항목 바로 앞, 목록 길이면 맨 뒤)
 * - isAllowed: 끄는 항목을 놓을 수 있는지(모두 폴더). 아니면 `not-allowed` 커서다
 */
export type FavoritesDrop = {
  areaId: string;
  slot: number;
  isAllowed: boolean;
};

/**
 * 항목 끌기 저장소. 끄는 동안 포인터 아래의 놓을 곳이다
 * - targetId: 포인터 아래의 놓을 곳 id(폴더 id, 휴지통 id, 바탕화면은 `desktop`). 끌지 않거나 놓을 곳이 아니면 null
 * - favoritesDrop: 포인터 아래의 즐겨찾기 놓을 자리. 아니면 null
 * - setTargetId: 놓을 곳을 바꾼다
 * - setFavoritesDrop: 즐겨찾기 놓을 자리를 바꾼다
 */
type ItemDragStore = {
  targetId: string | null;
  favoritesDrop: FavoritesDrop | null;
  setTargetId: (targetId: string | null) => void;
  setFavoritesDrop: (favoritesDrop: FavoritesDrop | null) => void;
};

/**
 * 항목을 끄는 동안 포인터 아래의 놓을 곳을 담는 저장소. 끄는 쪽(바탕화면, 어느 탐색기 창)과 상관없이 놓을 곳을 그린 쪽이
 * 그 폴더 아이콘·항목·탐색 창 칸을 강조하거나 즐겨찾기 놓을 자리에 가로선을 그릴 수 있게 창 밖에 둔다. 브라우저에 저장하지 않는다.
 * @codocs [[항목 조작:끌기]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:탐색 창]]
 */
export const useItemDragStore = create<ItemDragStore>()(
  /**
   * 처음 상태와 조작을 만든다.
   * @param set 상태를 바꾸는 함수
   * @returns 처음 상태와 조작
   */
  (set) => ({
    targetId: null,
    favoritesDrop: null,
    setTargetId: (targetId) => {
      set({ targetId });
    },
    setFavoritesDrop: (favoritesDrop) => {
      set({ favoritesDrop });
    },
  }),
);

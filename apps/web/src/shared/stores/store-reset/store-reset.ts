/** 저장소 하나를 처음 상태로 돌리는 함수 */
export type StoreReset = () => void;

// 등록된 초기화 함수. 저장소 모듈을 불러올 때 등록된다.
const storeResets = new Set<StoreReset>();

/**
 * 저장소를 처음 상태로 돌리는 함수를 등록한다. 저장소 모듈이 저장소를 만든 자리에서 부른다.
 * 모두 지우는 쪽(다시 시작)은 어떤 저장소가 있는지 모르고 등록된 함수만 부르므로, 같은 층의 다른 기능을 import하지 않아도 된다.
 * 브라우저에 저장하는 저장소(Zustand `persist`)는 등록하는 함수에서 저장분(`persist.clearStorage`)도 지운다.
 * @param reset 저장소를 처음 상태로 돌리는 함수
 */
export function registerStoreReset(reset: StoreReset): void {
  storeResets.add(reset);
}

/**
 * 등록된 저장소를 모두 처음 상태로 돌린다.
 */
export function resetRegisteredStores(): void {
  for (const reset of storeResets) {
    reset();
  }
}

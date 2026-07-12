import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * server render와 hydration 중에는 false, client snapshot에서는 true를 반환한다.
 * browser DOM을 사용하는 shell 기능이 hydration 이후에만 렌더링되도록 경계를 제공한다.
 *
 * @returns client snapshot을 사용할 수 있으면 true, 그렇지 않으면 false
 */
export const useIsHydrated = () =>
  useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

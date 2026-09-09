/**
 * @file WindowState에서 Application browser route를 파생한다.
 *
 * raw 주소 parsing, router 호출, history 실행과 bootstrap은 Application이 소유한다.
 */
import type { InternalAddress } from "../../chrome/index.js";
import type { ContentCatalogReader } from "../../resources/index.js";
import type { WindowState } from "../model/index.js";

const ROOT_ROUTE = "/" as InternalAddress;

/**
 * active Chrome의 active tab을 현재 canonical route로 투영한다.
 *
 * Explorer, active Session 부재, 현재 Catalog에서 사라진 Content는 Desktop root를 반환한다.
 * 이 selector는 router나 network를 호출하지 않는다.
 */
export const selectWindowRoute = (
  state: WindowState,
  contentCatalog: ContentCatalogReader,
): InternalAddress => {
  const session = state.sessions.find(({ id }) => id === state.activeSessionId);
  if (session?.kind !== "chrome") return ROOT_ROUTE;

  const tab = session.tabs.find(({ id }) => id === session.activeTabId);
  const location = tab?.navigation.current.location;
  if (location === undefined || location.kind === "new-tab") return ROOT_ROUTE;
  if (location.kind === "not-found") return location.address;

  const content = contentCatalog.get(location.ref.id);
  return content === undefined
    ? ROOT_ROUTE
    : (`/content/${content.ref.id}/${content.slug}` as InternalAddress);
};

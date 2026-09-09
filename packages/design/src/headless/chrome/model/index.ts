/**
 * @file Chrome tab의 internal location과 navigation 상태를 정의한다.
 *
 * 주소 검증, Content 원본 조회와 실제 browser routing은 Application이 소유한다.
 */
import type { ContentResourceRef } from "../../resources/index.js";
import type { NavigationState } from "../../windows/navigation/index.js";
import type { ChromeTabId } from "../chromeTabId/index.js";

declare const internalAddressBrand: unique symbol;

/**
 * Application이 same-origin 규칙으로 검증한 내부 주소를 나타낸다.
 *
 * raw 문자열 parsing이나 실제 browser navigation을 수행하지 않는 입력 계약이다.
 */
export type InternalAddress = string & {
  readonly [internalAddressBrand]: "InternalAddress";
};

/**
 * Chrome tab이 표시할 수 있는 new tab, Content 또는 안전한 내부 404 위치다.
 *
 * Content metadata와 renderer는 포함하지 않는다.
 */
export type ChromeLocation =
  | Readonly<{ kind: "new-tab" }>
  | Readonly<{ kind: "content"; ref: ContentResourceRef }>
  | Readonly<{ kind: "not-found"; address: InternalAddress }>;

/**
 * Chrome Window 안의 독립적인 tab 상태다.
 *
 * refresh는 navigation을 바꾸지 않고 `reloadRevision`만 증가시키는 명령으로 처리한다.
 */
export type ChromeTab = Readonly<{
  id: ChromeTabId;
  navigation: NavigationState<ChromeLocation>;
  reloadRevision: number;
}>;

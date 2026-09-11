import type { WorkspaceBreadcrumbItem } from "../../../../../../headless/workspace/index.js";

/**
 * 주소 표시줄에서 사용하는 breadcrumb 항목이다.
 */
export type AddressBreadcrumbItem = Readonly<{
  location: WorkspaceBreadcrumbItem["location"] | undefined;
  name: string;
  path: string;
}>;

/**
 * 긴 breadcrumb를 시작, 생략, 현재 위치 구간으로 나눈다.
 */
export const splitBreadcrumb = (items: readonly AddressBreadcrumbItem[]) =>
  items.length > 3
    ? { leading: items.slice(0, 1), hidden: items.slice(1, -1), trailing: items.slice(-1) }
    : { leading: items, hidden: [], trailing: [] };

/**
 * 해석할 수 없는 주소를 입력 문자열을 보존하는 표시용 breadcrumb로 변환한다.
 */
export const createUnresolvedBreadcrumb = (address: string): readonly AddressBreadcrumbItem[] => {
  const segments = address.startsWith("/") ? address.split("/").filter(Boolean) : [address];
  if (segments.length === 0) {
    return Object.freeze([{ location: undefined, name: address || "/", path: address }]);
  }

  let path = "";
  const unresolved = segments.map((name) => {
    path = address.startsWith("/") ? `${path}/${name}` : name;
    return Object.freeze({ location: undefined, name, path });
  });
  return address.startsWith("/")
    ? Object.freeze([{ location: null, name: "Desktop", path: "/" }, ...unresolved])
    : Object.freeze(unresolved);
};

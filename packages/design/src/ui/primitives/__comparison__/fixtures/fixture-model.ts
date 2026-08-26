import type { ContextMenuItem, DrawerPlacement, ScreenCoordinate } from "../contracts";

export const COMPARISON_ANCHOR: ScreenCoordinate = { x: 240, y: 180 };

export const COMPARISON_MENU_ITEMS: readonly ContextMenuItem[] = [
  { id: "open", kind: "action", label: "열기" },
  { checked: true, id: "pinned", kind: "checkbox", label: "작업 표시줄에 고정" },
  { id: "separator-primary", kind: "separator" },
  {
    id: "sort",
    items: [
      { checked: true, groupId: "sort-order", id: "sort-name", kind: "radio", label: "이름" },
      {
        checked: false,
        groupId: "sort-order",
        id: "sort-updated",
        kind: "radio",
        label: "수정한 날짜",
      },
    ],
    kind: "submenu",
    label: "정렬 기준",
  },
  { disabled: true, id: "unavailable", kind: "action", label: "사용할 수 없음" },
];

export const COMPARISON_DRAWER = {
  description: "선택한 창에 대한 빠른 작업을 표시합니다.",
  placement: "right" as DrawerPlacement,
  title: "빠른 작업",
  triggerLabel: "빠른 작업 열기",
};

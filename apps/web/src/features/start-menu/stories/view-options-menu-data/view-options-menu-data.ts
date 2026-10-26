// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start 보기 전환 메뉴(Menu/ViewOptions)를 그리는 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.

/** 피그마 Menu/ViewOptions: Start `보기:` 전환 메뉴 */
export const MENU_VIEW_OPTIONS = [
  { kind: 'checkbox', label: '범주', checked: false },
  { kind: 'checkbox', label: '그리드', checked: true },
  { kind: 'checkbox', label: '간단히', checked: false },
] as const;

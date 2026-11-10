import { type JSX, type ReactNode, useEffect, useRef } from 'react';

type StoryListboxProps = {
  label: string;
  isFocused?: boolean;
  children: ReactNode;
};

/**
 * 목록 항목(FileRow 등) 스토리를 감싸는 목록(`role="listbox"`)이다. 앱의 목록처럼 `group/list`를 걸어,
 * 항목이 포커스 유무에 따라 고르는 모습(파란 선택, 회색 선택)을 스토리에서도 그리게 한다.
 * 스토리는 클래스를 쓰지 않으므로 목록 클래스는 이 도우미가 단다. 크기와 배치는 주지 않는다.
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 * @codocs [[바탕화면 검수:13. 포커스가 없는 선택은 회색]]
 * @param props 컴포넌트 속성
 * @param props.label 목록의 접근성 이름
 * @param props.isFocused 켜면 그린 뒤 첫 항목(`role="option"`)에 포커스를 둔다. 끄면 목록 안의 포커스를 거둔다
 * @param props.children 목록 항목
 */
export function StoryListbox({
  label,
  isFocused = false,
  children,
}: StoryListboxProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(
    /**
     * isFocused에 맞춰 첫 항목에 포커스를 두거나 목록 안의 포커스를 거둔다.
     * 항목 안의 요소가 이미 포커스를 가졌으면(이름 바꾸기 입력창) 그대로 둔다.
     */
    () => {
      const list = listRef.current;
      if (list === null) return;
      const { activeElement } = document;
      const hasFocusInside = activeElement instanceof HTMLElement && list.contains(activeElement);
      if (isFocused) {
        if (!hasFocusInside) list.querySelector<HTMLElement>('[role="option"]')?.focus();
        return;
      }
      if (hasFocusInside) activeElement.blur();
    },
    [isFocused],
  );
  return (
    <div ref={listRef} role="listbox" aria-label={label} className="group/list">
      {children}
    </div>
  );
}

import { type JSX, type KeyboardEvent, useId, useRef, useState } from 'react';

import { ChromeAddressSuggestions } from '@/features/chrome/components/chrome-address-suggestions/chrome-address-suggestions';
import type { AddressSuggestionTarget } from '@/features/chrome/utils/chrome-address/chrome-address';

type ChromeAddressFieldProps = {
  /** 지금 페이지의 주소창 글자(입력하지 않을 때 보인다) */
  address: string;
  /** 입력 중인 글자의 추천 목록을 구한다 */
  getSuggestions: (query: string) => readonly AddressSuggestionTarget[];
  /** 추천을 골랐을 때(Enter나 클릭) */
  onSuggestionOpen: (target: AddressSuggestionTarget) => void;
  /** 추천을 고르지 않고 Enter를 눌렀을 때. 입력한 글자를 받는다 */
  onSubmit: (text: string) => void;
};

/** 주소창 접근성 이름(Chrome 주소창과 같다) */
export const ADDRESS_FIELD_LABEL = '주소 및 검색창';

// 고른 추천이 없음을 나타내는 차례다.
const NO_SELECTION = -1;

/**
 * Chrome 도구 모음의 주소창. 평소에는 지금 페이지의 주소를 보이고, 누르면 주소 전체를 선택한다(AddressBar).
 * 입력하면 아래에 추천 목록을 열고, 추천은 처음에 아무것도 고르지 않는다. ↓·↑로 고르고 Enter로 연다.
 * 고르지 않고 Enter를 누르면 입력한 글자를 넘긴다. Esc나 포커스를 잃으면 추천을 닫고 원래 주소로 돌린다. Esc는 돌린 주소 전체를 선택한다.
 * 한글을 조합하는 중에 누른 키는 받지 않는다.
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeAddressField(props: ChromeAddressFieldProps): JSX.Element {
  const { address, getSuggestions, onSuggestionOpen, onSubmit } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(NO_SELECTION);
  const [width, setWidth] = useState(0);
  const value = draft ?? address;
  const suggestions = isOpen ? getSuggestions(value) : [];
  const isListOpen = suggestions.length > 0;

  /** 입력을 끝내고 원래 주소로 돌린다(포커스를 잃었을 때도). */
  function handleReset(): void {
    setDraft(null);
    setIsOpen(false);
    setSelectedIndex(NO_SELECTION);
  }

  /**
   * 입력한 글자를 기억하고 추천 목록을 연다. 추천 목록 너비를 주소창 너비에 맞춘다.
   * @param next 입력한 글자
   */
  function handleValueChange(next: string): void {
    setDraft(next);
    setIsOpen(next.trim() !== '');
    setSelectedIndex(NO_SELECTION);
    setWidth(rootRef.current?.offsetWidth ?? 0);
  }

  /**
   * ↓·↑로 추천을 고르고, Enter로 열고, Esc로 원래 주소로 돌린다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!isListOpen) {
        return;
      }
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setSelectedIndex(
        Math.min(Math.max(selectedIndex + delta, NO_SELECTION), suggestions.length - 1),
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = isListOpen ? suggestions[selectedIndex] : undefined;
      const text = value;
      handleReset();
      event.currentTarget.blur();
      if (target === undefined) {
        onSubmit(text);
      } else {
        onSuggestionOpen(target);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleReset();
      // 다시 그릴 때 값이 바뀌면 선택이 풀리므로, 입력칸에 원래 주소를 먼저 넣고 선택한다(다시 그릴 때 값이 같아 그대로 남는다).
      event.currentTarget.value = address;
      event.currentTarget.select();
    }
  }

  /**
   * 추천 줄을 누르면 그 추천을 연다.
   * @param index 누른 줄의 순서
   */
  function handleSuggestionSelect(index: number): void {
    const target = suggestions[index];
    handleReset();
    if (target !== undefined) {
      onSuggestionOpen(target);
    }
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1">
      <ChromeAddressSuggestions
        role="combobox"
        aria-label={ADDRESS_FIELD_LABEL}
        aria-autocomplete="list"
        aria-expanded={isListOpen}
        aria-controls={isListOpen ? listId : undefined}
        aria-activedescendant={
          isListOpen && selectedIndex !== NO_SELECTION
            ? `${listId}-${String(selectedIndex)}`
            : undefined
        }
        value={value}
        onValueChange={handleValueChange}
        onKeyDown={handleKeyDown}
        onBlur={handleReset}
        open={isListOpen}
        width={width}
        listId={listId}
        suggestions={suggestions}
        selectedIndex={selectedIndex === NO_SELECTION ? undefined : selectedIndex}
        onSuggestionSelect={handleSuggestionSelect}
        className="w-full"
      />
    </div>
  );
}

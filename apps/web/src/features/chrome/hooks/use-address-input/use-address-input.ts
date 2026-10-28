import { type KeyboardEvent, useId, useState } from 'react';

import type { AddressSuggestionTarget } from '@/features/chrome/utils/chrome-address/chrome-address';

type AddressInputOptions = {
  /** 입력하지 않을 때 보이는 글자(주소창은 지금 페이지의 주소, 새 탭 검색창은 빈칸) */
  address: string;
  /** 입력 중인 글자의 추천 목록을 구한다 */
  getSuggestions: (query: string) => readonly AddressSuggestionTarget[];
  /** 추천을 골랐을 때(Enter나 클릭) */
  onSuggestionOpen: (target: AddressSuggestionTarget) => void;
  /** 추천을 고르지 않고 Enter를 눌렀을 때. 입력한 글자를 받는다 */
  onSubmit: (text: string) => void;
  /** 글자를 입력했을 때(추천 목록 너비를 맞출 때 쓴다) */
  onInput?: () => void;
};

/** 입력칸에 그대로 넘기는 콤보 상자 속성 */
type AddressInputProps = {
  /** 콤보 상자 역할 */
  role: 'combobox';
  /** 추천 목록을 띄운다는 표시 */
  'aria-autocomplete': 'list';
  /** 추천 목록을 열었는지 */
  'aria-expanded': boolean;
  /** 연 추천 목록 요소의 id */
  'aria-controls': string | undefined;
  /** 고른 추천 줄의 id */
  'aria-activedescendant': string | undefined;
  /** 입력칸 글자 */
  value: string;
  /** 글자를 입력했을 때 */
  onValueChange: (next: string) => void;
  /** 키를 눌렀을 때 */
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** 포커스를 잃었을 때 */
  onBlur: () => void;
};

/** 추천 입력칸의 상태와 속성 */
type AddressInput = {
  /** 입력칸 속성 */
  inputProps: AddressInputProps;
  /** 추천 목록 요소의 id */
  listId: string;
  /** 보이는 추천. 목록을 닫았으면 비어 있다 */
  suggestions: readonly AddressSuggestionTarget[];
  /** 추천 목록을 열었는지 */
  isListOpen: boolean;
  /** 고른 추천의 차례. 고르지 않았으면 undefined */
  selectedIndex: number | undefined;
  /** 추천 줄을 눌렀을 때. 그 추천을 연다 */
  onSuggestionSelect: (index: number) => void;
};

// 고른 추천이 없음을 나타내는 차례다.
const NO_SELECTION = -1;

/**
 * 주소창처럼 입력하면 추천 목록을 여는 입력칸의 상태와 키 처리다. Chrome 주소창과 새 탭 페이지 검색창이 함께 쓴다
 * (새 탭 검색창은 주소창과 같이 동작한다).
 * 입력하면 추천 목록을 열고, 추천은 처음에 아무것도 고르지 않는다. ↓·↑로 고르고 Enter로 연다.
 * 고르지 않고 Enter를 누르면 입력한 글자를 넘긴다. Esc나 포커스를 잃으면 추천을 닫고 원래 글자로 돌린다. Esc는 돌린 글자 전체를 선택한다.
 * 한글을 조합하는 중에 누른 키는 받지 않는다.
 * @codocs [[Chrome:주소창]]
 * @codocs [[Chrome:새 탭 페이지]]
 * @param options 입력칸 설정
 * @returns 입력칸 상태와 속성
 */
export function useAddressInput(options: AddressInputOptions): AddressInput {
  const { address, getSuggestions, onSuggestionOpen, onSubmit, onInput } = options;
  const listId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(NO_SELECTION);
  const value = draft ?? address;
  const suggestions = isOpen ? getSuggestions(value) : [];
  const isListOpen = suggestions.length > 0;

  /** 입력을 끝내고 원래 글자로 돌린다(포커스를 잃었을 때도). */
  function handleReset(): void {
    setDraft(null);
    setIsOpen(false);
    setSelectedIndex(NO_SELECTION);
  }

  /**
   * 입력한 글자를 기억하고 추천 목록을 연다.
   * @param next 입력한 글자
   */
  function handleValueChange(next: string): void {
    setDraft(next);
    setIsOpen(next.trim() !== '');
    setSelectedIndex(NO_SELECTION);
    onInput?.();
  }

  /**
   * ↓·↑로 추천을 고르고, Enter로 열고, Esc로 원래 글자로 돌린다.
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
      // 다시 그릴 때 값이 바뀌면 선택이 풀리므로, 입력칸에 원래 글자를 먼저 넣고 선택한다(다시 그릴 때 값이 같아 그대로 남는다).
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

  return {
    inputProps: {
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': isListOpen,
      'aria-controls': isListOpen ? listId : undefined,
      'aria-activedescendant':
        isListOpen && selectedIndex !== NO_SELECTION
          ? `${listId}-${String(selectedIndex)}`
          : undefined,
      value,
      onValueChange: handleValueChange,
      onKeyDown: handleKeyDown,
      onBlur: handleReset,
    },
    listId,
    suggestions,
    isListOpen,
    selectedIndex: selectedIndex === NO_SELECTION ? undefined : selectedIndex,
    onSuggestionSelect: handleSuggestionSelect,
  };
}

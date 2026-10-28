import type { JSX } from 'react';

import { ChromeNewTabSearch } from '@/features/chrome/components/chrome-new-tab-search/chrome-new-tab-search';
import { useAddressInput } from '@/features/chrome/hooks/use-address-input/use-address-input';
import type { AddressSuggestionTarget } from '@/features/chrome/utils/chrome-address/chrome-address';

type ChromeNewTabSearchFieldProps = {
  /** 입력 중인 글자의 추천 목록을 구한다(주소창 추천과 같다) */
  getSuggestions: (query: string) => readonly AddressSuggestionTarget[];
  /** 추천을 골랐을 때(Enter나 클릭) */
  onSuggestionOpen: (target: AddressSuggestionTarget) => void;
  /** 추천을 고르지 않고 Enter를 눌렀을 때. 입력한 글자를 받는다 */
  onSubmit: (text: string) => void;
};

/**
 * 새 탭 페이지 가운데의 검색창. 조립 `ChromeNewTabSearch`에 주소창과 같은 입력 동작(`useAddressInput`)을 잇는다.
 * 입력하면 주소창과 같은 추천 목록(글 최대 5개와 "<입력> 검색" 줄)을 열고, ↓·↑로 고르고 Enter나 클릭으로 연다.
 * 고르지 않고 Enter를 누르면 주소창에 입력한 것과 같이 간다. Esc나 포커스를 잃으면 추천을 닫고 빈칸으로 돌린다.
 * @codocs [[Chrome:새 탭 페이지]]
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeNewTabSearchField(props: ChromeNewTabSearchFieldProps): JSX.Element {
  const { getSuggestions, onSuggestionOpen, onSubmit } = props;
  const {
    inputProps,
    listId,
    suggestions,
    isListOpen,
    selectedIndex,
    onSuggestionSelect: handleSuggestionSelect,
  } = useAddressInput({ address: '', getSuggestions, onSuggestionOpen, onSubmit });

  return (
    <ChromeNewTabSearch
      {...inputProps}
      open={isListOpen}
      listId={listId}
      suggestions={suggestions}
      selectedIndex={selectedIndex}
      onSuggestionSelect={handleSuggestionSelect}
    />
  );
}

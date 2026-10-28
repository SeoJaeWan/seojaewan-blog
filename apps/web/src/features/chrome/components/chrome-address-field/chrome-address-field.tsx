import { type JSX, useRef, useState } from 'react';

import { ChromeAddressSuggestions } from '@/features/chrome/components/chrome-address-suggestions/chrome-address-suggestions';
import { useAddressInput } from '@/features/chrome/hooks/use-address-input/use-address-input';
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

/**
 * Chrome 도구 모음의 주소창. 평소에는 지금 페이지의 주소를 보이고, 누르면 주소 전체를 선택한다(AddressBar).
 * 입력하면 아래에 추천 목록을 연다. 추천 고르기와 Enter·Esc는 `useAddressInput`이 맡는다. 추천 목록 너비는 주소창 너비에 맞춘다.
 * @codocs [[Chrome:주소창]]
 * @param props
 */
export function ChromeAddressField(props: ChromeAddressFieldProps): JSX.Element {
  const { address, getSuggestions, onSuggestionOpen, onSubmit } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const {
    inputProps,
    listId,
    suggestions,
    isListOpen,
    selectedIndex,
    onSuggestionSelect: handleSuggestionSelect,
  } = useAddressInput({
    address,
    getSuggestions,
    onSuggestionOpen,
    onSubmit,
    onInput: handleInput,
  });

  /** 입력할 때 추천 목록 너비를 주소창 너비에 맞춘다. */
  function handleInput(): void {
    setWidth(rootRef.current?.offsetWidth ?? 0);
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1">
      <ChromeAddressSuggestions
        {...inputProps}
        aria-label={ADDRESS_FIELD_LABEL}
        open={isListOpen}
        width={width}
        listId={listId}
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        onSuggestionSelect={handleSuggestionSelect}
        className="w-full"
      />
    </div>
  );
}

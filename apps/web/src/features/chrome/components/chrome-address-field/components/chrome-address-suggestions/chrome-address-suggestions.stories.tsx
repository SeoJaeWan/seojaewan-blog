import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeAddressSuggestions } from './chrome-address-suggestions';
import { addressSuggestions } from './story-data';

type AddressSuggestionsState = 'closed' | 'open';

type AddressSuggestionsStoryArgs = {
  state: AddressSuggestionsState;
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 변형 State(Closed·Open)를 `state` arg로 고른다.
// Open은 입력하는 중 추천 목록이 열린 모습이고 두 번째 줄을 고른(Selected) 모습이다. 열림 동작은 ChromeAddressField 동작 스토리가 확인한다.
const meta = {
  title: 'Patterns/Chrome/AddressSuggestions',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { state: 'closed' },
  argTypes: {
    state: { control: 'inline-radio', options: ['closed', 'open'] },
  },
  render: ({ state }) => {
    const isOpen = state === 'open';
    return (
      <ChromeAddressSuggestions
        aria-label="주소 및 검색창"
        query={addressSuggestions.query}
        width={addressSuggestions.width}
        suggestions={addressSuggestions.items}
        isOpen={isOpen}
        selectedIndex={isOpen ? addressSuggestions.selectedIndex : undefined}
      />
    );
  },
} satisfies Meta<AddressSuggestionsStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

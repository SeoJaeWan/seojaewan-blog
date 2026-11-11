import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeAddressSuggestions } from './chrome-address-suggestions';
import { addressSuggestions } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 조립은 변형이 없는 단일 그림이라 열린 모습 하나만 둔다.
// 입력하는 중 추천 목록이 열린 모습이고 두 번째 줄을 고른(Selected) 모습이다. 열림 동작은 ChromeAddressField 동작 스토리가 확인한다.
const meta = {
  title: 'Patterns/Chrome/AddressSuggestions',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  // 피그마 조립의 바깥 상자는 카드이고, 코드의 바깥 상자는 입력 줄이라 카드를 캡처 기준으로 지정한다.
  render: () => (
    <div data-parity-target data-parity-box='[data-slot="suggestions-card"]'>
      <ChromeAddressSuggestions
        aria-label="주소 및 검색창"
        query={addressSuggestions.query}
        width={addressSuggestions.width}
        suggestions={addressSuggestions.items}
        isOpen
        selectedIndex={addressSuggestions.selectedIndex}
      />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

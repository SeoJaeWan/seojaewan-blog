import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeAddressSuggestions } from './chrome-address-suggestions';
import { addressSuggestions } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
// 피그마는 닫힌 모양이다. 추천 목록은 입력하면 여는 팝업이라 열림과 항목은 ChromeAddressField 동작 스토리가 확인한다.
const meta = {
  title: 'Patterns/Chrome/AddressSuggestions',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  render: () => (
    <ChromeAddressSuggestions
      aria-label="주소 및 검색창"
      query={addressSuggestions.query}
      width={addressSuggestions.width}
      suggestions={addressSuggestions.items}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChromeAddressSuggestions } from './chrome-address-suggestions';
import { ADDRESS_SUGGESTIONS } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
// 추천 목록은 트리거 밖으로 뜨는 팝업이라, 감싸는 요소에 캡처 대상(data-parity-target)을 달지 않고 루트를 그대로 찍는다.
const meta = {
  title: 'Patterns/Chrome/AddressSuggestions',
  // 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  render: () => (
    <ChromeAddressSuggestions
      aria-label="주소 및 검색창"
      query={ADDRESS_SUGGESTIONS.query}
      suggestions={ADDRESS_SUGGESTIONS.items}
      selectedIndex={ADDRESS_SUGGESTIONS.selectedIndex}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// 색 대비는 피그마 값을 사람이 판단할 때까지 이 스토리에서 끈다(임의 작업 문서의 "색 대비 위반" 항목).
export const Parity: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};

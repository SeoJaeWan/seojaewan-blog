import { Menu } from '@base-ui/react/menu';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';

import { BreadcrumbChevron } from './breadcrumb-chevron';

// 피그마 BreadcrumbChevron의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'open'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
};

const meta = {
  title: 'Components/BreadcrumbChevron',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  // `State=Open`은 코드에서 isOpen이다. 도구가 넘긴 state arg를 prop으로 바꾼다.
  render: (args) => <BreadcrumbChevron label="하위 폴더" isOpen={args.state === 'open'} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
/** 라벨을 접근성 이름으로 갖는 버튼이다. 누르면 onClick을 부른다 */
export const Default: Story = {
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <BreadcrumbChevron label="하위 폴더" onClick={handleClick} />
  ),
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '하위 폴더' });

    await expect(button).toHaveAttribute('data-open', 'false');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * Base UI 메뉴 트리거의 render로 넣고 열림 상태를 isOpen으로 넘긴 모습이다.
 * @returns 메뉴 트리거로 쓴 꺾쇠 버튼
 */
function MenuTriggerExample() {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * 메뉴가 열고 닫히려 할 때 열림 상태를 바꾼다.
   * @param isNextOpen 바뀔 열림 상태
   */
  function handleOpenChange(isNextOpen: boolean) {
    setIsOpen(isNextOpen);
  }
  return (
    <Menu.Root open={isOpen} modal={false} onOpenChange={handleOpenChange}>
      <Menu.Trigger render={<BreadcrumbChevron label="하위 폴더" isOpen={isOpen} />} />
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup>
            <Menu.Item>하위 폴더 이름</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// @codocs [[컴포넌트 목록:상태]]
/** 메뉴 트리거로 쓰면 누를 때 메뉴가 열리고, 열린 동안 아래 꺾쇠(⌄) 모양이다 */
export const MenuTrigger: Story = {
  render: () => <MenuTriggerExample />,
  // Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다. 외부 라이브러리 구조라 이 규칙만 끈다.
  parameters: { a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } },
  play: async ({ canvas, userEvent, step }) => {
    const button = canvas.getByRole('button', { name: '하위 폴더' });

    await step('닫혀 있으면 오른쪽 꺾쇠다', async () => {
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(button).toHaveAttribute('data-open', 'false');
    });

    await step('누르면 메뉴가 열리고 열림 모양이 된다', async () => {
      await userEvent.click(button);
      await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
      await expect(button).toHaveAttribute('data-open', 'true');
    });
  },
};
